Fliplet.Widget.register('PushNotifications', function () {

  var id = $('[data-push-notification-id]').data('push-notification-id');
  var data = Fliplet.Widget.getData(id);
  var key = 'push-allow-' + Fliplet.Env.get('appId');
  var $popup = $('.popup-screen');

  if (!data || !data.configured) {
    return removeFromDom();
  }

  function removeFromDom() {
    $popup.remove();
  }

  function dismiss() {
    $popup.removeClass('ready');
  }

  function markAsSeen() {
    return Fliplet.Storage.set(key, Date.now());
  }

  function ask() {
    return new Promise(function (resolve, reject) {
      $popup.find('[data-allow]').one('click', function () {
        dismiss();

        Fliplet.Navigator.onReady().then(function (){
          return Fliplet.User.subscribe(data);
        }).then(function (subscriptionId) {
          markAsSeen();
          resolve(subscriptionId);
        }, function (err) {
          console.error(err);
          markAsSeen();

          reject({
            code: 1,
            message: err
          });
        });
      });

      $popup.find('[data-dont-allow]').one('click', function () {
        dismiss();
        markAsSeen();

        reject({
          code: 2,
          message: 'The user did not allow push notifications.'
        });
      });

      $popup.find('[data-remind]').one('click', function () {
        dismiss();
        markAsSeen();

        reject({
          code: 3,
          message: 'The user pressed the "remind later" button.'
        });
      });

      $popup.addClass('ready');
    });
  }

  function pushAllowed() {
    return new Promise(function (resolve, reject) {
      var pushToken;
      Fliplet.Storage.get('push-token-' + Fliplet.Env.get('appId'))
        .then(function(token) {
          pushToken = token || "";
          if (pushToken !== "" || typeof pushToken !== "undefined") {
            resolve(pushToken);
          } else {
            reject({
              code: "notAllowed",
              message: err
            });
          }
        }, function (err) {
          console.error(err);

          reject({
            code: "notAllowed",
            message: err
          });
        });
    });
  }

  if (data.showAutomatically) {
    Fliplet.Storage.get(key).then(function (alreadyShown) {
      console.log(alreadyShown)
      if (!alreadyShown) {
        ask();
      }
    });
  }

  return {
    ask: ask,
    pushAllowed: pushAllowed,
    reset: function () {
      return Fliplet.Storage.remove(key);
    }
  };

});
