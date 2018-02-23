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
    return removeFromDom();
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

  function ask() {
    if (askPromise) {
      return askPromise;
    }

    askPromise = Fliplet.Storage.get(key);

    askPromise.then(function (value) {
      if (!value || value.indexOf('disallow') === -1) {
        return Promise.resolve();
      }

      return Promise.reject({
        code: 4,
        message: 'User has disallowed push notifications'
      });
    }).then(function () {
      if (Fliplet.Env.get('platform') === 'web') {
        return Promise.resolve();
      }

      return new Promise(function (resolve, reject) {
        $popup.find('[data-allow]').one('click', function () {
          dismiss();
          markAsSeen('allow');

          Fliplet.Navigator.onReady().then(function () {
            return subscribeUser();
          }).then(function (subscriptionId) {
            resolve(subscriptionId);
          }, function (err) {
            console.error(err);

            reject({
              code: 1,
              message: err
            });
          });
        });

        $popup.find('[data-dont-allow]').one('click', function () {
          dismiss();
          markAsSeen('disallow');

          reject({
            code: 2,
            message: 'The user did not allow push notifications.'
          });
        });

        $popup.find('[data-remind]').one('click', function () {
          dismiss();
          markAsSeen('remind');

          reject({
            code: 3,
            message: 'The user pressed the "remind later" button.'
          });
        });

        $popup.addClass('ready');
      });
    });

    return askPromise;
  }

  Fliplet.Navigator.onReady().then(function () {
    return Fliplet.Storage.get(key);
  }).then(function (alreadyShown) {
    Fliplet.User.getSubscriptionId().then(function (isSubscribed) {
      var push = Fliplet.User.getPushNotificationInstance(data);

      if (!push) {
        return;
      }

      if (isSubscribed) {
        //Clear any notifications
        push.setApplicationIconBadgeNumber(function () { }, function () { }, 1);
        push.clearAllNotifications(function () { }, function () { });
      }

      push.on('notification', function (data) {
        Fliplet.Hooks.run('pushNotification', data).then(function () {
          // @TODO: show toast
          // Specs: https://docs.google.com/document/d/1Rtqbyvha9UufODVZoi45Bmvl1Cbs4EU1FdsYxybVgvA/edit
          // On notification click, run the commented out block below

          if (data.additionalData) {
            // Navigate to screen or else
            if (data.additionalData.action) {
              var appPages = Fliplet.Env.get('appPages');
              var updateItem = { handlerScreenId: Fliplet.Env.get('pageId'), targetScreenId: parseInt(data.additionalData.action) };

              if (Array.isArray(appPages) && appPages.length) {
                var page = appPages.filter(function(page) { return page.id === updateItem.targetScreenId || page.masterPageId === updateItem.targetScreenId });

                if (!page.length) {
                  //page doesn't exist try to update
                  Fliplet.Native.Updates.checkForUpdates(Fliplet.Env.get('appId'), true, null, updateItem);
                  return;
                }
                else {
                  Fliplet.Storage.set('fl_notification_update', updateItem).then(function () {
                    Fliplet.Navigate.screen(updateItem.targetScreenId, {
                      query: window.location.search,
                      addToHistory: (updateItem.targetScreenId !== Fliplet.Env.get('pageId'))
                    });
                  });
                }
              }
            }
          }
        });
      });
    });

    // Show the popup if hasn't been shown yet to the user
    // and the component is set for automatic display
    if (!alreadyShown && data.showAutomatically) {
      return ask();
    }

    // Check if user has pressed allow but for some reason isn't subscribed yet.
    // This also happens when the user pressed allow from a parent app (portal)
    // and "showOnceOnPortal" is checked
    if (typeof alreadyShown === 'string' && alreadyShown.indexOf('allow') === 0) {
      return subscribeUser();
    }
  });

  return {
    ask: ask,
    reset: function () {
      return Fliplet.Storage.remove(key);
    }
  };

});
