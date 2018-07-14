import { join } from "path";
import * as url from "common/util/url";
import registeredProtocols from "main/reactors/launch/html/itch-internal-persistent-state";

const WEBGAME_PROTOCOL = "itch-cave";

interface BeforeSendHeadersDetails {
  url: string;
}

interface BeforeSendHeadersCallbackOpts {
  cancel: boolean;
}

interface BeforeSendHeadersCallback {
  (opts: BeforeSendHeadersCallbackOpts): void;
}

interface RegisterProtocolOpts {
  partition: string;
  fileRoot: string;
}

import { session } from "electron";
import { ItchPromise } from "common/util/itch-promise";

export async function registerProtocol(opts: RegisterProtocolOpts) {
  const { partition, fileRoot } = opts;

  if (registeredProtocols[partition]) {
    return;
  }

  const caveSession = session.fromPartition(partition, { cache: false });

  await new ItchPromise((resolve, reject) => {
    caveSession.protocol.registerFileProtocol(
      WEBGAME_PROTOCOL,
      (request, callback) => {
        const urlPath = url.parse(request.url).pathname;
        const decodedPath = decodeURI(urlPath);
        const rootlessPath = decodedPath.replace(/^\//, "");
        const filePath = join(fileRoot, rootlessPath);

        callback(filePath);
      },
      error => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      }
    );
  });

  const handled = await new ItchPromise((resolve, reject) => {
    caveSession.protocol.isProtocolHandled(WEBGAME_PROTOCOL, result => {
      resolve(result);
    });
  });

  if (!handled) {
    throw new Error(`could not register custom protocol ${WEBGAME_PROTOCOL}`);
  }

  registeredProtocols[partition] = true;
}

type ItchInternalRequestCallback = (details: BeforeSendHeadersDetails) => void;

interface ItchInternalOpts {
  session: Electron.Session;
  onRequest: ItchInternalRequestCallback;
}

export function setupItchInternal(opts: ItchInternalOpts) {
  const { session } = opts;

  // requests to 'itch-internal' are used to communicate between web content & the app
  const internalFilter = {
    urls: ["https://itch-internal/*"],
  };

  session.webRequest.onBeforeRequest(
    { urls: ["itch-cave://*"] },
    (details, callback) => {
      let parsed = url.parse(details.url);
      // resources in `//` will be loaded using itch-cave, we need to
      // redirect them to https for it to work - note this only happens with games
      // that aren't fully offline-mode compliant
      if (parsed.protocol === "itch-cave:" && parsed.host !== "game.itch") {
        callback({
          redirectURL: details.url.replace(/^itch-cave:/, "https:"),
        });
      } else {
        callback({});
      }
    }
  );

  session.webRequest.onBeforeSendHeaders(
    internalFilter,
    (
      details: BeforeSendHeadersDetails,
      callback: BeforeSendHeadersCallback
    ) => {
      callback({ cancel: true });
      opts.onRequest(details);
    }
  );
}
