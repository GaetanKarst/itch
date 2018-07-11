import { actions } from "common/actions";
import { messages } from "common/butlerd";
import { Build, Game, Upload, Cave } from "common/butlerd/messages";
import { Logger } from "common/logger";
import { Store } from "common/types/index";
import { Watcher } from "common/util/watcher";
import { mcall } from "main/butlerd/mcall";
import { mainLogger } from "main/logger";
import { makeUploadButton } from "main/reactors/make-upload-button";
import { modals } from "common/modals";
import { isEmpty, map } from "underscore";
import { promisedModal } from "../modals";
import asTask from "./as-task";
import { makeInstallErrorModal } from "./make-install-error-modal";

const logger = mainLogger.child(__filename);

export default function(watcher: Watcher) {
  watcher.on(actions.queueGame, async (store, action) => {
    const { game, caveId } = action.payload;
    let caves: Cave[];

    if (caveId) {
      const { cave } = await mcall(messages.FetchCave, { caveId });
      if (cave) {
        caves = [cave];
      }
    } else {
      caves = (await mcall(messages.FetchCaves, {
        filters: { gameId: game.id },
      })).items;
    }

    if (isEmpty(caves)) {
      logger.info(
        `No cave for ${game.title} (#${game.id}), attempting install`
      );
      await queueInstall(store, game);
      return;
    }

    logger.info(
      `Have ${caves.length} caves for game ${game.title} (#${game.id})`
    );

    if (caves.length === 1) {
      const cave = caves[0];
      store.dispatch(actions.queueLaunch({ cave }));
      return;
    }

    store.dispatch(
      actions.openModal(
        modals.naked.make({
          wind: "root",
          title: ["prompt.launch.title", { title: game.title }],
          message: ["prompt.launch.message"],
          bigButtons: map(caves, cave => {
            return {
              ...makeUploadButton(cave.upload),
              action: actions.queueLaunch({ cave }),
            };
          }),
          buttons: ["cancel"],
          widgetParams: null,
        })
      )
    );
  });

  watcher.on(actions.queueGameInstall, async (store, action) => {
    const { game, upload } = action.payload;
    await queueInstall(store, game, upload);
  });
}

async function queueInstall(
  store: Store,
  game: Game,
  upload?: Upload,
  build?: Build
) {
  await asTask({
    name: "install-queue",
    gameId: game.id,
    store,
    work: async (ctx, logger) => {
      await performInstallQueue({ store, logger, game, upload, build });
    },
    onError: async (e, log) => {
      store.dispatch(
        actions.openModal(
          makeInstallErrorModal({
            store,
            e,
            log,
            game,
            retryAction: () => actions.queueGameInstall({ game, upload }),
            stopAction: () => null,
          })
        )
      );
    },
    onCancel: async () => {
      store.dispatch(
        actions.statusMessage({
          message: `Install for ${game.title} cancelled!`,
        })
      );
    },
  });
}

async function performInstallQueue({
  store,
  logger,
  game,
  upload,
  build,
}: {
  store: Store;
  logger: Logger;
  game: Game;
  upload: Upload;
  build: Build;
}) {
  const installLocationId = defaultInstallLocation(store);

  await mcall(
    messages.InstallQueue,
    {
      game,
      upload,
      build,
      installLocationId,
      queueDownload: true,
    },
    convo => {
      convo.on(messages.PickUpload, async ({ uploads }) => {
        const { title } = game;

        const modalRes = await promisedModal(
          store,
          modals.pickUpload.make({
            wind: "root",
            title: ["pick_install_upload.title", { title }],
            message: ["pick_install_upload.message", { title }],
            coverUrl: game.coverUrl,
            stillCoverUrl: game.stillCoverUrl,
            bigButtons: map(uploads, (candidate, index) => {
              return {
                ...makeUploadButton(candidate),
                action: modals.pickUpload.action({
                  pickedUploadIndex: index,
                }),
              };
            }),
            buttons: ["cancel"],
            widgetParams: {},
          })
        );

        if (modalRes) {
          return { index: modalRes.pickedUploadIndex };
        } else {
          // that tells butler to abort
          return { index: -1 };
        }
      });

      convo.on(messages.ExternalUploadsAreBad, async () => {
        const modalRes = await promisedModal(
          store,
          modals.naked.make({
            wind: "root",
            title: "Dragons be thar",
            message:
              "You've chosen to install an external upload. Those are supported poorly.",
            detail:
              "There's a chance it won't install at all.\n\nAlso, we won't be able to check for updates.",
            bigButtons: [
              {
                label: "Install it anyway",
                tags: [{ label: "Consequences be damned" }],
                icon: "fire",
                action: actions.modalResponse({}),
              },
              "nevermind",
            ],
            widgetParams: null,
          })
        );

        if (!modalRes) {
          return { whatever: false };
        }

        // ahh damn.
        return { whatever: true };
      });
    }
  );
  store.dispatch(actions.downloadQueued({}));
}

function defaultInstallLocation(store: Store) {
  const { defaultInstallLocation } = store.getState().preferences;
  return defaultInstallLocation;
}