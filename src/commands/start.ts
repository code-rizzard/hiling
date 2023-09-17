import { Args, Command, Flags, ux } from "@oclif/core";
import { URL } from "url";

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
    const { args, flags } = await this.parse(Start);

    let url = args.url;
    let timeout = flags.timeout;

    if (!url) {
      do {
        try {
          let n = await ux.prompt("What is the url?", {
            required: true,
          });
          url = new URL(n);
        } catch {
          this.log("Invalid URL.");
          continue;
        }
      } while (url == undefined);
    }

    ux.action.start(`[GET] to ${url}`, "nice");

    let totalRequest = 0;

    setInterval(() => {
      ux.action.status = `${totalRequest} finished.`;
      totalRequest += 1;
    }, timeout);
  }
}
