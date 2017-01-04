Fliplet.Widget.register('PushNotifications', function () {

  var id = $('[data-push-notification-id]').data('push-notification-id');
  var data = Fliplet.Widget.getData(id);
  var key = 'push-allow';
  var $popup = $('.popup-screen');

  if (!data || !data.showOnceOnPortal) {
    key += '-' + Fliplet.Env.get('appId');
  }

  if (!data || !data.configured) {
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
  }

  Fliplet.Navigator.onReady().then(function () {
    return Fliplet.Storage.get(key);
  }).then(function (alreadyShown) {
    var push = Fliplet.User.getPushNotificationInstance(data);
    
    if (push) {
      // TODO: clear badges 
    }
    
    
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
