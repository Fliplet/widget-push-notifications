Fliplet.Widget.register('PushNotifications', function () {

  var id = $('[data-push-notification-id]').data('push-notification-id');
  var data = Fliplet.Widget.getData(id);
  var key = 'push-allow';
  var $popup = $('.popup-screen');
  var askPromise;

  var isConfigured = data && (data.apn || data.gcm || data.wns);

  if (!data || !data.showOnceOnPortal) {
    key += '-' + Fliplet.Env.get('appId');
  }

  if (!data || !isConfigured) {
    removeFromDom();
  }

  function removeFromDom() {
    $popup.remove();
  }

  function dismiss() {
    $popup.removeClass('ready');
  }

  function markAsSeen(val) {
    return Fliplet.Storage.set(key, val + '-' + Date.now());
  }

  function subscribeUser() {
    return Fliplet.User.subscribe(data);
  }

  function handleNotificationPayload(data) {
    if (!data || !data.page) {
      return;
    }

    var appPages = Fliplet.Env.get('appPages');

    if (Array.isArray(appPages) && appPages.length) {
      var page = appPages.filter(function(page) { return page.masterPageId === parseInt(data.page) || page.id === parseInt(data.page);});

      if (!page.length || Fliplet.Env.get('pageId') === parseInt(data.page)) {
        Fliplet.Native.Updates.checkForUpdates(Fliplet.Env.get('appId'), true, null, data);
        return;
      }
      else {
        Fliplet.Storage.set('fl_notification_update', data).then(function () {
          Fliplet.Navigate.screen(data.page);
        });
      }
    }
  }

  function bindLocalNotificationsClick() {
    if (!Fliplet.Env.is('native')) {
      return; // only native devices
    }

    if (typeof cordova.plugins.notification === 'undefined') {
      return; // do nothing if native app hasn't got the plugin installed
    }

    cordova.plugins.notification.local.on('click', function (notification) {
      /**
       * customData will carry the data needed for deep-links, for example:
       * "customData":{"options":{"hideAction":true},"action":"screen","page":"106","transition":"slide.left"}
       */
      if (notification && notification.data && notification.data.customData) {
        handleNotificationPayload(notification.data.customData);
      }
    }, this);

    if (cordova.plugins.notification.local.launchDetails) {
      console.log('Launch details', launchDetails);
    }
  }

  function handleForegroundNotification(data) {
    Fliplet.Navigator.Notifications.schedule({
      title: data.title,
      text: data.message,
      foreground: true,
      data: data.additionalData
    }, function () {
      // notification has been scheduled
    }, this, { skipPermission: true });
  }

  function ask() {
    if (!data || !isConfigured) {
      return Promise.reject({
        code: 0,
        message: 'Please configure your push notification settings first.'
      });
    }

    // Push notifications are not enabled in Fliplet Studio.
    // We just return a promise that is never fulfilled.
    if (Fliplet.Env.get('interact')
      || (Fliplet.Env.is('web') && Fliplet.Env.get('mode') === 'preview')) {
      return new Promise(function () {});
    }

    if (Fliplet.Env.is('web') && Fliplet.Env.get('mode') === 'view') {
      return Promise.reject({
        code: -1,
        message: 'Push notifications are not supported on the web platform.'
      });
    }

    if (askPromise) {
      return askPromise;
    }

    askPromise = Fliplet.Storage.get(key).then(function (alreadyShown) {
      if (!alreadyShown || typeof alreadyShown !== 'string') {
        return true;
      }

      // If the user already allowed, just subscribe it
      if (alreadyShown.indexOf('allow') === 0) {
        return false;
      }

      return Promise.reject({
        code: 4,
        message: 'User has disallowed push notifications'
      });
    }).then(function (displayPopup) {
      if (!displayPopup) {
        return subscribeUser();
      }

      return new Promise(function (resolve, reject) {
        $popup.find('[data-allow]').one('click', function () {
          dismiss();

          markAsSeen('allow').then(function () {
            return subscribeUser();
          }).then(resolve).catch(function (err) {
            console.error(err);

            reject({
              code: 1,
              message: err
            });

            askPromise = undefined;
          });
        });

        $popup.find('[data-dont-allow]').one('click', function () {
          dismiss();
          markAsSeen('disallow').then(function () {
            reject({
              code: 2,
              message: 'The user did not allow push notifications.'
            });

            askPromise = undefined;
          }).catch(reject);
        });

        $popup.find('[data-remind]').one('click', function () {
          dismiss();
          markAsSeen('remind').then(function () {
            reject({
              code: 3,
              message: 'The user pressed the "remind later" button.'
            });

            askPromise = undefined;
          }).catch(reject);
        });

        $popup.addClass('ready');
      });
    });

    return askPromise;
  }

  if (isConfigured) {
    Fliplet().then(function () {
      return Fliplet.User.getSubscriptionId();
    }).then(function (isSubscribed) {
      var push = Fliplet.User.getPushNotificationInstance(data);

      if (push) {
        function clearNotifications() {
          push.clearAllNotifications(function () {
            // cleared
          }, function (err) {
            console.error('Cannot clear notifications', err);
          });
        }

        //Clear any notification after setting the badge to 1 (it's a hack)
        push.setApplicationIconBadgeNumber(function () {
          clearNotifications();
        }, function (err) {
          console.error('Cannot set badge number', err);
          clearNotifications();
        }, 1);

        if (isSubscribed) {
          push.on('notification', function (data) {
            Fliplet.Hooks.run('pushNotification', data).then(function () {
              if (data.additionalData) {
                if (data.additionalData.foreground) {
                  handleForegroundNotification(data);
                  return;
                }

                handleNotificationPayload(data.additionalData.customData);
              }
            });
          });

          bindLocalNotificationsClick();
        }
      }

      if (!isSubscribed && data.showAutomatically) {
        ask();
      }
    });
  }

  return {
    ask: ask,
    reset: function () {
      askPromise = undefined;
      return Fliplet.Storage.remove(key);
    }
  };
});
