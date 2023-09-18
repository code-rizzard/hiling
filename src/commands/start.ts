import { Args, Command, Flags, ux } from "@oclif/core";
import axios from "axios";
import chalk from "chalk";
import { URL } from "url";
import axiosRetry from "axios-retry";
import * as fs from "fs";
import * as path from "path";
import * as z from "zod";

const allowedMethods = ["GET", "POST", "PUT", "DELETE", "PATCH"];

function isValidHttpMethod(val: string) {
  return allowedMethods.includes(val.toUpperCase());
}

const JSON_CONFIG = z.object({
  url: z.string().url().optional(),
  method: z
    .string()
    .refine(isValidHttpMethod, (val) => ({
      message: `Invalid method ${val}. Allowed methods are ${allowedMethods.join}.`,
    }))
    .optional(),
  timeout: z.number().int().positive().optional(),
  maxFails: z.number().int().positive().optional(),
});

export default class Start extends Command {
  static description = "Starts the automatic requests.";

  static examples = ["<%= config.bin %> <%= command.id %>"];

  static flags = {
    timeout: Flags.integer({
      default: 0,
      description: "The timeout between requests",
    }),
    method: Flags.string({
      default: "",
      description: "The HTTP method to use",
      aliases: ["m"],
    }),
    maxFails: Flags.integer({
      default: 0,
      description: "The maximum fails before stopping",
    }),
  };

  static args = {
    url: Args.url({ description: "url to request" }),
  };

  private async readJsonConfig(): Promise<z.infer<typeof JSON_CONFIG>> {
    const filePath = path.join(path.resolve("./"), "hiling.config.json");
    let userConfig: any;
    if (fs.existsSync(filePath)) {
      this.log(chalk.gray("Found hiling.config.json."));
      try {
        userConfig = JSON.parse(fs.readFileSync(filePath, "utf8"));
        this.log(chalk.gray("Loaded hiling.config.json"));
      } catch (error) {
        this.log(error as any);
      }
    }

    return JSON_CONFIG.parse(userConfig);
  }

  private async validateConfig() {
    const { args, flags } = await this.parse(Start);

    const userConfig = await this.readJsonConfig();
    flags.method ||= userConfig?.method ?? "GET";
    flags.timeout ||= userConfig?.timeout ?? 250;
    flags.maxFails ||= userConfig?.maxFails ?? 999999;
    args.url ??= new URL(userConfig?.url ?? "");

    let method = flags.method;

    if (!isValidHttpMethod(method)) {
      throw new Error(
        `Invalid method ${method}. Allowed methods are ${allowedMethods.join(
          ", "
        )}`
      );
    }
    let url = args.url;

    if (!url) {
      do {
        try {
          let n = await ux.prompt(`${chalk.green("What is the url?: ")}`, {
            required: true,
          });
          args.url = new URL(n);
        } catch {
          this.log(chalk.red("Invalid URL."));
          continue;
        }
      } while (args.url == undefined);
    }

    return {
      args,
      flags,
      userConfig,
    };
  }

  public async run(): Promise<void> {
    axiosRetry(axios, { retries: 3 });

    const { args, flags } = await this.validateConfig();

    let { method, timeout } = flags;
    let { url } = args;

    new ApiRequester(url!, method, timeout, flags.maxFails, this).start();
  }
}

class ApiRequester {
  constructor(
    private url: URL,
    private method: string,
    private timeout: number,
    private maxFails: number,
    private instance: Start
  ) {}

  public async start() {
    let totalRequest = 0;
    let success = 0;
    let failed = 0;

    ux.action.start(
      `${chalk.blue(`[${this.method.toUpperCase()}]`)} to ${chalk.blue(
        this.url
      )}`
    );

    const { maxFails, instance, method, timeout, url } = this;

    const interval = setInterval(async () => {
      ux.action.status = `${chalk.green(`${success} success`)}. ${chalk.red(
        `${failed} fails.`
      )} / ${chalk.cyan(`${totalRequest} total`)} `;
      totalRequest += 1;
      try {
        await axios.request({
          url: url?.toString()!,
          method,
        });
        success += 1;
      } catch (error) {
        const err = error as Error;
        if (failed % 50 == 0) {
          instance.log(
            `${chalk.red(`Failed to request ${url}`)} because of ${err.message}`
          );
        }
        failed += 1;
        if (failed > maxFails) {
          clearInterval(interval);
          instance.log(
            chalk.redBright(
              `Stopped after ${totalRequest} failed requests due to maxFails of ${maxFails}.`
            )
          );
          ux.action.stop(chalk.grey("Stopped due to maxFails."));
        }
      }
    }, timeout);
  }
}
