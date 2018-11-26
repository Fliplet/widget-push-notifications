/*****************  UIPushNotification  *****************/
/*****************  UIPushNotification  *****************/
/*****************  UIPushNotification  *****************/

var UIPushNotification = (function() {
  // this reference
  var _this;

  // Constructor
  function UIPushNotification() {
    _this = this;
    _this.initUI();
    _this.attachObservers();
  }

  UIPushNotification.prototype = {
    constructor: UIPushNotification,
    titleCharLimit: 50,
    messageCharLimit: 235,
    notificationConfig: {},
    sendErrorMessage: '',
    subscriptionsCount: 0,
    mockedRequest: Fliplet.Env.get('development'), // Use a mocked request under development environment
    linkActionProvider: {},
    linkData: {
      action: 'screen',
      page: '',
      transition: 'slide.left',
      options: {
        hideAction: true
      }
    },
    linkSavedData: {},
    toSendNotification: false,
    showPreviewScreen: false,
    errorMessageTimeout: undefined
  };

  UIPushNotification.prototype.initUI = function() {
    var getSubscriptionsCount = this.mockedRequest
      ? Promise.resolve([1,2,3])
      : Fliplet.App.Subscriptions.get();

    $('.app-name').html(Fliplet.Env.get('appName'));

    Fliplet.App.get()
      .then(function (app) {
        if (!app || !app.icon) {
          return;
        }

        $('<img>')
          .on('load', function () {
            $('#push-notification-form .app-icon-preview').attr('src', app.icon);
          })
          .attr('src', app.icon);
      });

    getSubscriptionsCount.then(function(subscriptions) {
      _this.subscriptionsCount = subscriptions.length;
      if (_this.subscriptionsCount === 0) {
        $('#push-subscription-note').html('<p>No devices registered to receive this notification<br><small class="help-block"><strong>Note:</strong> Users can disable notifications on their devices.</small></p>');
        $('#push-subscription-note').addClass('text-danger');
        Fliplet.Widget.autosize();
        $('#push-subscription-note').removeClass('toHide');
      } else {
        $('#push-subscriptions').html(_this.subscriptionsCount);
        $('#push-subscription-note').removeClass('toHide');
      }
    });

    // Initialise the link provider
    _this.linkProviderInit();

    // Initialise message preview
    _this.onNotificationMessageUpdated();

    // Initialise Bootstrap Switch
    $('#push_notification_badge').bootstrapSwitch().on('switchChange.bootstrapSwitch', function() {
      if ($(this).is(':checked')) {
        $('#push-notification-badge-icon').addClass('checked');
      } else {
        $('#push-notification-badge-icon').removeClass('checked');
      }
    });

    // Initialise Bootstrap Datetime Picker
    $('#pushDatetimepicker').datetimepicker({
      inline: true,
      sideBySide: true,
      defaultDate: moment(new Date()).add(1, 'hours')
    });
  };

  UIPushNotification.prototype.attachObservers = function() {
    // Notification message character limit countdown
    $(document).on('keyup paste input blur change', '#push_notification_title, #push_notification_message', _this.onNotificationMessageUpdated);

    // Sets up callback for activating notification send modal
    // $(document).on( 'click', '#notification-confirm', _this.initialiseNotificationConfirmationModal );

    // Sets up callback for sending/cancelling notification sending
    $(document).on('click', '#push-notification-form .notification-send', function(event){
      event.preventDefault();

      if ($('#push_show_link_provider').is(':checked')) {
        _this.linkActionProvider.forwardSaveRequest();
        return;
      }

      _this.sendValidation();
    });

    $(document).on('click', '#push-notification-form .notification-cancel', _this.cancelNotificationSend);
    $(document).on('click', '#push-notification-form .push-preview-target-screen', function(event) {
      event.preventDefault();

      _this.showPreviewScreen = true;
      _this.linkActionProvider.forwardSaveRequest();
    });

    $(document).on('click', '#push-notification-form .enter-subscription-ids', function (e) {
      e.preventDefault();
      $('#target-push-subscription-ids').removeClass('hidden');
      Fliplet.Widget.autosize();
    });
  };

  UIPushNotification.prototype.showNotificationReviewModal = function() {
    var targetSubscriptionIDs = _.compact(_.map($('#push-subscription-ids').val().split(','), function (id) {
      return parseInt(id, 10);
    }));

    // Add subscription count to HTML
    $('#push-notification-form .subscriptions-count').html(targetSubscriptionIDs.length
      ? targetSubscriptionIDs.length
      : _this.subscriptionsCount);

    // Get HTML for modal
    var html = $('#push-notification-form .notifications-preview').html();

    // Open Modal
    return Fliplet.Modal.confirm({
      size: 'large',
      title: 'Push notification preview',
      message: html,
      buttons: {
        confirm: {
          label: 'Send push notification'
        }
      }
    });
  }

  UIPushNotification.prototype.sendValidation = function(hasError) {
    _this.sendErrorMessage = "";
    var title = $('#push_notification_title').val();
    var body = $('#push_notification_message').val();
    var hasErrors = typeof hasError !== 'undefined' ? hasError : false;

    // Reset error messages
    $('.push_notification_title_error').addClass('hidden');
    $('.push_notification_message_error').addClass('hidden');

    if (!title) {
      $('.push_notification_title_error').removeClass('hidden');
      hasErrors = true;
    }
    if (!body) {
      $('.push_notification_message_error').removeClass('hidden');
      hasErrors = true;
    }

    if (hasErrors) {
      return;
    }

    _this.showNotificationReviewModal().then(function (result) {
      if (result) {
        _this.toSendNotification = true;
        _this.linkActionProvider.forwardSaveRequest();
      }
    });
  }

  UIPushNotification.prototype.linkProviderInit = function() {
    _this.linkActionProvider = Fliplet.Widget.open('com.fliplet.link', {
      // If provided, the iframe will be appended here,
      // otherwise will be displayed as a full-size iframe overlay
      selector: '#push-link-provider',
      // Also send the data I have locally, so that
      // the interface gets repopulated with the same stuff
      data: _this.linkData,
      closeOnSave: false
    });

    // Fired when the provider has finished
    _this.linkActionProvider.then(function (result) {
      _this.linkSavedData.action = result.data;
      clearTimeout(_this.errorMessageTimeout);
      $('.push-screen-error').addClass('hidden');

      if (_this.toSendNotification) {
        _this.toSendNotification = false;
        _this.startNotificationSend();
        return;
      }

      if (_this.showPreviewScreen) {
        _this.showPreviewScreen = false;
        _this.openPreviewOverlay();
        return;
      }

      if (!result.data || !result.data.page) {
        $('.push-screen-error').removeClass('hidden');
        _this.sendValidation(true);
        _this.errorMessageTimeout = setTimeout(function() {
          $('.push-screen-error').addClass('hidden');
        }, 5000);
        return;
      }

      _this.sendValidation();
    });
  }

  UIPushNotification.prototype.openPreviewOverlay = function() {
    Fliplet.Studio.emit('overlay', {
      name: 'page-preview',
      options: {
        size: 'medium',
        title: 'Previewing target screen',
        classes: 'preview-notification',
        data: {
          appId: Fliplet.Env.get('appId'),
          pageId: _this.linkSavedData.action.page,
          query: _this.linkSavedData.action.query
        }
      }
    });
  }

  UIPushNotification.prototype.onNotificationMessageUpdated = function() {
    var $titleField = $('#push_notification_title');
    var $messageField = $('#push_notification_message');

    var previewHtml = '';
    if ($titleField.val().length) {
      previewHtml += '<strong>' + $titleField.val() + '</strong><br>';
    }
    previewHtml += $messageField.val();

    $('#notification-message-preview .notification-message').html(previewHtml);
    if (!$titleField.val().length && !$messageField.val().length) {
      $('#notification-message-preview').addClass('message-empty');
    } else {
      $('#notification-message-preview').removeClass('message-empty');
    }
    _this.refreshCharCount($titleField, _this.titleCharLimit);
    _this.refreshCharCount($messageField, _this.messageCharLimit);
  };

  UIPushNotification.prototype.refreshCharCount = function($field, charLimit) {
    var count = $field.val().length;
    var $countContainer = $($field.data('countSelector'));
    var $countLabel = $countContainer.parents('.countlabel');
    $countContainer.html(charLimit - count);
    if (count > charLimit) {
      $countLabel.addClass('text-danger').removeClass('text-success');
      $field.parents('.form-group').addClass('has-error');
    } else {
      $countLabel.removeClass('text-danger').addClass('text-success');
      $field.parents('.form-group').removeClass('has-error');
    }
  };

  UIPushNotification.prototype.notificationConfigurationIsValid = function() {
    /**
     * Notification configuration is valid if:
     *
     *  - Message is not above character limit
     *  - Message is non-empty or icon badge is enabled
     *  - Schedule option is 'asap' or 'scheduled'
     *  - Scheduled date is at least 5 minutes or later from now
     *
     **/

    var configurationIsValid = true;

    var notificationMessage = $('#push_notification_message').val();
    if (notificationMessage.length > _this.messageCharLimit) {
      configurationIsValid = false;
    }

    if (notificationMessage.length === 0 && !$('#notification_badge').is(':checked')) {
      configurationIsValid = false;
    }

    var notificationScheduleOption = $('#push-schedule-options > li.active:eq(0)').data('option');
    if (notificationScheduleOption !== 'asap' && notificationScheduleOption !== 'scheduled') {
      configurationIsValid = false;
    }

    if (notificationScheduleOption === 'scheduled') {
      var scheduleDate = moment(new Date($('#pushDatetimepicker').find('input').val()));
      var now = moment();
      if (scheduleDate.diff(now, 'days') < -1) {
        configurationIsValid = false;
      }
    }

    return configurationIsValid;
  };

  UIPushNotification.prototype.initialiseNotificationConfirmationModal = function(e) {
    // @NOTE: Currently not used (copied from legacy UI)

    if (!_this.notificationConfigurationIsValid()) {
      return;
    }
    // Populate notification message
    var notificationMessage = $('#push_notification_message').val();
    if (notificationMessage === '') {
      $('#notification-summary-not-receive-message').show();
      $('#notification-summary-receive-message').hide();
    } else {
      $('#notification-summary-message').html(notificationMessage);
      $('#notification-summary-not-receive-message').hide();
      $('#notification-summary-receive-message').show();
    }

    // Populate notification badge increment
    if ($('#push_notification_badge').is(':checked')) {
      $('#push-notification-summary-badge-not').hide();
    } else {
      $('#push-notification-summary-badge-not').show();
    }

    // Populate notification schedule
    switch ($('#push-schedule-options > li.active:eq(0)').data('option')) {
      case 'asap':
        $('#notification-summary-schedule').html('ASAP');
        break;
      case 'scheduled':
        var scheduleDate = moment(new Date($('#pushDatetimepicker').find('input').val()));
        var dateString = scheduleDate.format('Do MMM YYYY');
        var timeString = scheduleDate.format('hh:mm A');
        var timezoneString = $.trim($('label[for=' + $(':input[name=push_notification_timezone]:checked').attr('id') + ']').text());
        $('#notification-summary-schedule').html('<br/>on ' + dateString + ' at ' + timeString + ' (' + timezoneString + ')');
        break;
    }

    $('#push-notification-form').attr('data-mode', 'confirm');
    $("body").data("modalmanager").getOpenModals().pop().layout();
  };

  UIPushNotification.prototype.initialiseNotificationConfiguration = function() {
    /**
     * See https://www.parse.com/docs/js/guide#push-notifications for more configuration options
     *
     * @param alert   String
     * @param badge   String Set as "Increment" to increase iOS icon badge by 1
     * @param push_time Date
     *
     **/
    var everyoneQuery = new Parse.Query(Parse.Installation);
    _this.notificationConfig = {
      where: everyoneQuery,
      data: {}
    };
    if ($('#push_notification_message').val() !== '') {
      _this.notificationConfig.data.alert = $('#push_notification_message').val();
    }
    if ($('#notification_badge').is(':checked') === true) {
      _this.notificationConfig.data.badge = 'Increment';
    }
    if ($('#push-schedule-options > li.active:eq(0)').data('option') === 'scheduled') {
      _this.notificationConfig.push_time = moment(new Date($('#pushDatetimepicker').find('input').val())).format('YYYY-MM-DDTHH:mm');
      if ($('label[for=' + $(':input[name=push_notification_timezone]:checked').attr('id') + ']').index('#notification-scheduled .btn-group-vertical label') === 1) {
        _this.notificationConfig.push_time += '+00:00';
      }
    }
  };

  UIPushNotification.prototype.startNotificationSend = function() {
    $('#push-notification-form').attr('data-mode', 'confirm');
    // Send request
    _this.sendNotification()
      .then(function(response) {
        // Push was successful
        _this.notificationIsSent(response);
      })
      .catch(function(error) {
        // Handle error
        var msg = error.responseJSON && error.responseJSON.message || error.message || error;
        _this.sendErrorMessage = "Error: " + msg;
        _this.notificationIsNotSent();
      });
  };

  UIPushNotification.prototype.cancelNotificationSend = function() {
    $('#push-notification-form').find('textarea, input').val('');
    _this.onNotificationMessageUpdated();
    $('#push-notification-form').attr('data-mode', '');
    $('#push-notifications-tab').attr('data-mode', 'list');
    Fliplet.Widget.autosize();
  };

  UIPushNotification.prototype.sendNotification = function() {
    var title = $('#push_notification_title').val();
    var body = $('#push_notification_message').val();
    var data = {
      title: title,
      body: body,
      badge: 1
    };

    // Check if page is set for deep linking
    if ($('#push_show_link_provider').is(':checked') && _this.linkSavedData.action && _this.linkSavedData.action.page) {
      data.custom = {
        data: _this.linkSavedData.action
      }
    }

    var targetSubscriptionIDs = _.compact(_.map($('#push-subscription-ids').val().split(','), function (id) {
      return parseInt(id, 10);
    }));
    if (targetSubscriptionIDs.length) {
      data.subscriptions = targetSubscriptionIDs;
    }

    // Reset progress bar
    $('.notification-summary-sending .progress-bar').width('0%');
    $('#push-notification-form').attr('data-mode', 'sending');
    Fliplet.Widget.autosize();
    // Set progress bar to UI to provide visual user feedback
    $('.notification-summary-sending .progress-bar').width('90%');

    if (_this.mockedRequest) {
      return new Promise(function(resolve, reject) {
        var mockSuccessResponse = false;
        if (mockSuccessResponse) {
          return resolve({
            subscriptionsCount: targetSubscriptionIDs.length
          });
        }
        return reject({
          message: 'Mocked error response'
        });
      });
    }

    return Fliplet.App.PushNotifications.send(data);
  };

  UIPushNotification.prototype.notificationIsSent = function(response) {
    response = response || {};
    var count = response.subscriptionsCount;
    $('#push-notification-form').attr('data-mode', 'sent');
    Fliplet.Widget.autosize();
    $('.notification-summary-sending .progress-bar').width('100%');
    Fliplet.Modal.alert({
      title: 'Notification sent',
      message: 'Your notification has been sent to up to <strong>' + (count || _this.subscriptionsCount) + '</strong> registered device(s).'
    }).then(function () {
      $('#push-notification-form').attr('data-mode', '');
      _this.resetNotificationForm();
      Fliplet.Widget.autosize();
      return Fliplet.Hooks.run('pushNotificationSent', notification, isUpdate);
    });
  };

  UIPushNotification.prototype.notificationIsNotSent = function() {
    $('#push-notification-form').attr('data-mode', 'error');
    Fliplet.Widget.autosize();
    $('.notification-summary-sending .progress-bar').width('100%');
    if (!_this.sendErrorMessage.length) {
      _this.sendErrorMessage = 'There was an error sending your notification';
    }
    Fliplet.Modal.alert({
      title: 'Error',
      message: _this.sendErrorMessage
    });
    $('#push-notification-form').attr('data-mode', '');
  };

  UIPushNotification.prototype.resetNotificationForm = function() {
    $('#push_notification_title, #push_notification_message').val('');
    $('#notification-message-preview').addClass('message-empty');
    setTimeout(_this.onNotificationMessageUpdated, 0);
    return false;
  };

  return UIPushNotification;
})();

/***************  END: UIPushNotification  ***************/
/***************  END: UIPushNotification  ***************/
/***************  END: UIPushNotification  ***************/
