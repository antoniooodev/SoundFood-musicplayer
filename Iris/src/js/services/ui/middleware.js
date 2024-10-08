const uiActions = require("./actions.js");

const UIMiddleware = (function () {
  return (store) => (next) => (action) => {
    switch (action.type) {
      case "MOPIDY_STATE":
        // Get the current track from our index
        var { tracks } = store.getState().core;
        var current_track_uri = store.getState().core.current_track;
        var current_track = null;
        if (tracks[current_track_uri] !== undefined) {
          current_track = tracks[current_track_uri];
        }
        next(action);
        break;

      case "SET_WINDOW_TITLE":
        var window_title = "";

        if (action.play_state) {
          var { play_state } = action;
        } else {
          var { play_state } = store.getState().mopidy;
        }

        if (action.title) {
          var { title } = action;
        } else {
          var title = store.getState().ui.window_title;
        }

        document.title = `${window_title} ${title}`;

        next(action);
        break;

      case "CLOSE_MODAL":
        next(action);
        if (action.url) {
          window.location = action.url;
        } else {
          window.history.back();
        }
        break;

      case "HIDE_CONTEXT_MENU":
        if (store.getState().ui.context_menu) {
          setTimeout(() => {
            store.dispatch(uiActions.removeContextMenu());
          }, 200);
          next(action);
        }
        break;

      case "HIDE_TOUCH_CONTEXT_MENU":
        if (store.getState().ui.context_menu) {
          setTimeout(() => {
            store.dispatch(uiActions.removeTouchContextMenu());
          }, 200);
          next(action);
        }
        break;

      case "BROWSER_NOTIFICATION":
        var notification =
          window.Notification ||
          window.mozNotification ||
          window.webkitNotification;
        if (typeof notification === "undefined") return false;
        if (typeof notification !== "undefined")
          notification.requestPermission((permission) => {});

        // handle nested data objects
        var data = {};
        if (typeof action.data) data = action.data;
        if (typeof data.data) data = { ...data, ...data.data };

        // construct our browser notification
        var title = "";
        var options = {
          body: "",
          dir: "auto",
          lang: "EN",
          tag: "iris",
        };
        if (data.title) title = data.title;
        if (data.body) options.body = data.body;
        if (data.icon) options.icon = data.icon;

        // make it so
        var notification = new notification(title, options);
        break;

      case "CREATE_NOTIFICATION":
        // start a timeout to close this notification
        if (!action.notification.sticky) {
          setTimeout(() => {
            store.dispatch(
              uiActions.closeNotification(action.notification.key)
            );
          }, action.notification.duration * 1000);
        }

        next(action);
        break;

      case "CLOSE_NOTIFICATION":
        var notifications = { ...store.getState().ui.notifications };

        // start a timeout to remove this notification
        // This gives us time to animate out the notification before we remove the data
        setTimeout(() => {
          store.dispatch(uiActions.removeNotification(action.key));
        }, 200);

        next(action);
        break;

      case "REMOVE_NOTIFICATION":
        // Manual removal
        if (action.manual) {
          var notifications = { ...store.getState().ui.notifications };

          // If a broadcast, add to suppressed_broadcasts
          if (
            notifications[action.key] &&
            notifications[action.key].type == "broadcast"
          ) {
            store.dispatch({
              type: "SUPPRESS_BROADCAST",
              key: action.key,
            });
          }
        }

        next(action);
        break;

      case "PROCESS_CANCELLED":
        store.dispatch({
          type: `${action.key}_CANCELLED`,
        });
        store.dispatch(uiActions.closeProcess(action.key));
        next(action);
        break;

      case "PROCESS_FINISHED":
        store.dispatch({
          type: `${action.key}_FINISHED`,
        });

        // Start a timeout to remove this notification
        // This gives us time to animate out the notification before we remove the data
        if (action.completionNotification) {
          store.dispatch(
            uiActions.updateProcess(action.key, action.completionNotification)
          );
          if (!action.completionNotification.sticky) {
            setTimeout(() => {
              store.dispatch(uiActions.closeProcess(action.key));
            }, 5000);
          }
        } else {
          store.dispatch(uiActions.closeProcess(action.key));
        }

        next(action);
        break;

      case "CLOSE_PROCESS":
        setTimeout(() => {
          store.dispatch(uiActions.removeProcess(action.key));
        }, 200);
        next(action);
        break;

      case "SET_LANGUAGE":
        const { language } = action;
        window.language = language;
        store.dispatch(uiActions.set({ language }));
        break;

      // This action is irrelevant to us, pass it on to the next middleware
      default:
        return next(action);
    }
  };
})();

export default UIMiddleware;
