import { Args, Command, Flags, ux } from "@oclif/core";
import axios from "axios";
import chalk from "chalk";
import { URL } from "url";
import axiosRetry from "axios-retry";

export default class Start extends Command {
  static description = "Starts the automatic requests.";

  static examples = ["<%= config.bin %> <%= command.id %>"];

  static flags = {
    timeout: Flags.integer({
      default: 250,
      description: "The timeout between requests",
    }),
  };

  static args = {
    file: Args.string({ description: "file to read" }),
    url: Args.url({ description: "url to request" }),
  };

  public async run(): Promise<void> {
    axiosRetry(axios, { retries: 3 });

    const { args, flags } = await this.parse(Start);
    let url = args.url;
    let timeout = flags.timeout;

    if (!url) {
      do {
        try {
          let n = await ux.prompt(`${chalk.green("What is the url?: ")}`, {
            required: true,
          });
          url = new URL(n);
        } catch {
          this.log(chalk.red("Invalid URL."));
          continue;
        }
      } while (url == undefined);
    }

    ux.action.start(`${chalk.blue("[GET]")} to ${chalk.blue(url)}`);
    let totalRequest = 0;
    let success = 0;
    let failed = 0;
    setInterval(async () => {
      ux.action.status = `${chalk.green(`${success} success`)}. ${chalk.red(
        `${failed} fails.`
      )} / ${chalk.cyan(`${totalRequest} total`)} `;
      totalRequest += 1;
      try {
        await axios.request({
          url: url?.toString()!,
        });
        success += 1;
      } catch (err) {
        if (failed % 50 == 0) {
          this.log(
            `${chalk.red(`Failed to request ${url}`)} because of ${err}`
          );
        }
        failed += 1;
      }
    }, timeout);
  }
}
