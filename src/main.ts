// Imports here
import CNShell, { HttpError } from "cn-shell";

import fs from "fs";

// Rancid proxy config consts here
const CFG_RANCID_CFG_DIR = "RANCID_CFG_DIR";
const CFG_RANCID_FQDN = "RANCID_FQDN";

// Route constants here
const ROUTE_BASE = "/api";

const ROUTE_SWITCH = `${ROUTE_BASE}/switch`;

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

    this._cfgDir = this.getRequiredCfg(CFG_RANCID_CFG_DIR);
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
}

let proxy = new CNRancidProxy("RancidProxy");
proxy.init();
