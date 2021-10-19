// Imports here
import CNShell, { HttpError } from "cn-shell";

import fs from "fs";

// Rancid proxy config consts here
const CFG_RANCID_CFG_DIR = "RANCID_CFG_DIR";
const CFG_RANCID_FQDN = "RANCID_FQDN";

// Route constants here
const ROUTE_BASE = "/api";

const ROUTE_SWITCH = `${ROUTE_BASE}/switch`;

const QRY_REGEX = "regex";

// HTTP Prop Patterns here

process.on("unhandledRejection", error => {
  // Will print "unhandledRejection err is not defined"
  console.log("unhandledRejection", error);
});
// CNRancidProxy class here
class CNRancidProxy extends CNShell {
  // Properties here
  private _cfgDir: string;
  private _fqdn: string;

  // Constructor here
  constructor(name: string) {
    super(name);

    let dir = this.getRequiredCfg(CFG_RANCID_CFG_DIR);
    this._cfgDir = dir.replace(/(\/)*$/, ""); // Strip any trailing slashes

    this._fqdn = this.getCfg(CFG_RANCID_FQDN, "");

    if (this._fqdn.length) {
      this._fqdn = `.${this._fqdn}`;
    }

    this.setupRoutes();
  }

  // Abstract method implementations here
  async start(): Promise<boolean> {
    return true;
  }

  async stop(): Promise<void> {
    return;
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  // Public methods here
  private setupRoutes() {
    this.simpleReadRoute(
      ROUTE_SWITCH,
      async id => this.get(id),
      true,
      false,
      {},
      "text/plain",
    );

    this.simpleReadRoute(
      ROUTE_SWITCH,
      async (_, query) => this.getList(query),
      false,
      false,
    );
  }

  private async get(switchName: string): Promise<string> {
    let fileName = `${this._cfgDir}/${switchName}${this._fqdn}`;
    let config = "";

    this.debug("Searching for switch config", fileName);

    try {
      config = fs.readFileSync(fileName, "utf8");
      config = config.replace(/\n/g, "\r\n");
    } catch (e) {
      this.error(e);

      let error: HttpError = {
        status: 404,
        message: `Can not find config file ${fileName}`,
      };

      throw error;
    }

    return config;
  }

  private async getList(query: {
    [key: string]: string | string[];
  }): Promise<string[]> {
    // Default regex is for all switches
    let qryRegExs = query[QRY_REGEX] === undefined ? ".*" : query[QRY_REGEX];

    this.debug("Searching for switches matching: %j", qryRegExs);

    let regExs: RegExp[] = [];

    // Check if there was one (string) or multiple regexs (string[]) passed
    try {
      if (typeof qryRegExs === "string") {
        regExs.push(new RegExp(qryRegExs));
      } else {
        // Loop through each filter
        for (let qryRegEx of qryRegExs) {
          regExs.push(new RegExp(qryRegEx));
        }
      }
    } catch (e) {
      this.error(e);

      let error: HttpError = {
        status: 400,
        message: `There was an issue with your regEx: (${e})`,
      };

      throw error;
    }

    let switches: string[] = [];
    let dir: string[];

    try {
      dir = fs.readdirSync(this._cfgDir);
    } catch (e) {
      this.error(e);

      let error: HttpError = {
        status: 404,
        message: "There was an issue getting the switch list",
      };

      throw error;
    }

    // Check for match with each file name returned
    for (let file of dir) {
      // Strip off the FQDN
      let switchName = file.replace(this._fqdn, "");

      // Check if it matches any of the regexs
      for (let regEx of regExs) {
        if (regEx.test(switchName)) {
          if (switches.includes(switchName)) {
            continue;
          }

          switches.push(switchName);
        }
      }
    }

    return switches;
  }
}

let proxy = new CNRancidProxy("RancidProxy");
proxy.init();
