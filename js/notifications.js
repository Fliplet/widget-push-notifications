(function () {

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

  Fliplet.Navigator.onReady().then(function () {
    return Fliplet.Storage.get(key);
  }).then(function (value) {
    if (value) {
      return removeFromDom();
    }

    $popup.find('[data-allow]').click(function () {
      dismiss();
      Fliplet.User.subscribe().then(function () {
        markAsSeen();
      }, function (err) {
        alert(err);
        markAsSeen();
      });
    });

    $popup.find('[data-dont-allow]').click(function () {
      dismiss();
      markAsSeen();
    });

    $popup.find('[data-remind]').click(function () {
      dismiss();
      markAsSeen();
    });

    $popup.addClass('ready');
  });

})();