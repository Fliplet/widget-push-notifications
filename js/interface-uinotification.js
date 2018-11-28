/*****************  UINotification  *****************/
/*****************  UINotification  *****************/
/*****************  UINotification  *****************/

var UINotification = (function() {
  // this reference
  var _this;
  var DEFAULT_LINK_DATA = {
    action: 'screen',
    page: '',
    transition: 'slide.left',
    options: {
      hideAction: true
    }
  };
  var loadedNotification;

  // Constructor
  function UINotification() {
    _this = this;
    _this.initUI();
    _this.attachObservers();
  }

  UINotification.prototype = {
    constructor: UINotification,
    titleCharLimit: 50,
    messageCharLimit: 235,
    notificationConfig: {},
    sendErrorMessage: '',
    subscriptionsCount: 0,
    mockedRequest: Fliplet.Env.get('development'), // Use a mocked request under development environment
    linkActionProvider: {},
    linkData: _.cloneDeep(DEFAULT_LINK_DATA),
    linkSavedData: {},
    toSendNotification: false,
    showPreviewScreen: false,
    errorMessageTimeout: undefined
  };

  UINotification.prototype.initUI = function() {
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
            $('#notification-form .app-icon-preview').attr('src', app.icon);
          })
          .attr('src', app.icon);
      });

    getSubscriptionsCount.then(function(subscriptions) {
      _this.subscriptionsCount = subscriptions.length;
      if (_this.subscriptionsCount === 0) {
        $('#subscription-note').html('<p>No devices registered to receive this notification<br><small class="help-block"><strong>Note:</strong> Users can disable notifications on their devices.</small></p>');
        $('#subscription-note').addClass('text-danger');
        Fliplet.Widget.autosize();
      } else {
        $('#subscriptions').html(_this.subscriptionsCount);
      }
      Fliplet.Widget.autosize();
    });

    // Initialise the link provider
    _this.linkProviderInit();

    // Initialise message preview
    _this.onNotificationMessageUpdated();

    // Initialise Bootstrap Switch
    $('#notification_badge').bootstrapSwitch().on('switchChange.bootstrapSwitch', function() {
      if ($(this).is(':checked')) {
        $('#notification-badge-icon').addClass('checked');
      } else {
        $('#notification-badge-icon').removeClass('checked');
      }
    });

    // Initialise Bootstrap Datetime Picker
    $('#datetimepicker').datetimepicker({
      inline: true,
      sideBySide: true,
      defaultDate: moment(new Date()).add(1, 'hours')
    });
  };

  UINotification.prototype.attachObservers = function() {
    // Notification message character limit countdown
    $(document).on('keyup paste input blur change', '#notification_title, #notification_message', _this.onNotificationMessageUpdated);

    // Sets up callback for activating notification send modal
    // $(document).on( 'click', '#notification-confirm', _this.initialiseNotificationConfirmationModal );

    // Sets up callback for sending/cancelling notification sending
    $(document).on('click', '#notification-form .notification-send', function(event){
      event.preventDefault();

      if ($('#show_link_provider').is(':checked')) {
        _this.linkActionProvider.forwardSaveRequest();
        return;
      }

      _this.sendValidation();
    });

    $(document).on('click', '#notification-form .notification-cancel', _this.cancelNotificationSend);
    $(document).on('click', '#notification-form .preview-target-screen', function(event) {
      event.preventDefault();

      _this.showPreviewScreen = true;
      _this.linkActionProvider.forwardSaveRequest();
    });

    $(document).on('click', '#notification-form .enter-subscription-ids', function (e) {
      e.preventDefault();
      $('#target-subscription-ids').removeClass('hidden');
      Fliplet.Widget.autosize();
    });

    $(document).on('change', '#show_link_provider', _this.onAddLinkUpdated);

    $(document).on('change', '#send_push_notification', _this.onPushNotificationToggled);

    $(document).on('change', 'input[type="radio"][name="notification_status"]', _this.onStatusUpdated);
  };

  UINotification.prototype.showNotificationReviewModal = function() {
    var targetSubscriptionIDs = [];
    if ($('#subscription-ids').length) {
      targetSubscriptionIDs = _.compact(_.map($('#subscription-ids').val().split(','), function (id) {
        return parseInt(id, 10);
      }));
    }

    // Add subscription count to HTML
    $('#notification-form .subscriptions-count').html(targetSubscriptionIDs.length
      ? targetSubscriptionIDs.length
      : _this.subscriptionsCount);

    if ($('#send_push_notification').is(':checked')) {
      $('#notification-form .notifications-preview .push-notification-preview').removeClass('hidden');
    } else {
      $('#notification-form .notifications-preview .push-notification-preview').addClass('hidden');
    }

    // Get HTML for modal
    var html = $('#notification-form .notifications-preview').html();

    // Open Modal
    return Fliplet.Modal.confirm({
      size: 'large',
      title: 'Notification preview',
      message: html,
      buttons: {
        confirm: {
          label: !!$('#notification_id').val() ? 'Save notification' : 'Send notification'
        }
      }
    });
  }

  UINotification.prototype.sendValidation = function(hasError) {
    _this.sendErrorMessage = "";
    var title = $('#notification_title').val();
    var body = $('#notification_message').val();
    var hasErrors = typeof hasError !== 'undefined' ? hasError : false;

    // Reset error messages
    $('.notification_title_error').addClass('hidden');
    $('.notification_message_error').addClass('hidden');

    if (!title) {
      $('.notification_title_error').removeClass('hidden');
      hasErrors = true;
    }
    if (!body) {
      $('.notification_message_error').removeClass('hidden');
      hasErrors = true;
    }

    if (hasErrors) {
      return;
    }

    _this.showNotificationReviewModal().then(function (confirmed) {
      if (!confirmed) {
        return;
      }

      _this.toSendNotification = true;
      _this.linkActionProvider.forwardSaveRequest();
    });
  }

  UINotification.prototype.linkProviderInit = function() {
    $('#link-provider').empty();
    _this.linkActionProvider = Fliplet.Widget.open('com.fliplet.link', {
      // If provided, the iframe will be appended here,
      // otherwise will be displayed as a full-size iframe overlay
      selector: '#link-provider',
      // Also send the data I have locally, so that
      // the interface gets repopulated with the same stuff
      data: _this.linkData,
      closeOnSave: false
    });

    // Fired when the provider has finished
    _this.linkActionProvider.then(function (result) {
      _this.linkSavedData.action = result.data;
      clearTimeout(_this.errorMessageTimeout);
      $('.screen-error').addClass('hidden');

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
        $('.screen-error').removeClass('hidden');
        _this.sendValidation(true);
        _this.errorMessageTimeout = setTimeout(function() {
          $('.screen-error').addClass('hidden');
        }, 5000);
        return;
      }

      _this.sendValidation();
    });
  }

  UINotification.prototype.openPreviewOverlay = function() {
    if (!_this.linkSavedData.action.page) {
      Fliplet.Modal.alert({
        message: 'Please select a screen to preview'
      });
      return;
    }

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

  UINotification.prototype.onNotificationMessageUpdated = function() {
    var $titleField = $('#notification_title');
    var $messageField = $('#notification_message');

    var previewHtml = '';
    if ($titleField.val().length) {
      previewHtml += '<strong>' + $titleField.val() + '</strong><br>';
    }
    previewHtml += $messageField.val();

    $('#notification-form .notifications-preview .notification-message').html(previewHtml);
    if (!$titleField.val().length && !$messageField.val().length) {
      $('#notification-message-preview').addClass('message-empty');
    } else {
      $('#notification-message-preview').removeClass('message-empty');
    }
    _this.refreshCharCount($titleField, _this.titleCharLimit);
    _this.refreshCharCount($messageField, _this.messageCharLimit);
  };

  UINotification.prototype.onStatusUpdated = function() {
    var loadedAsPublished = loadedNotification && (loadedNotification.status === 'published');
    if ($('#notification_status_published').prop('checked') && !loadedAsPublished) {
      $('#push_notification_form_group').removeClass('hidden');
    } else {
      $('#push_notification_form_group').addClass('hidden');
    }
    Fliplet.Widget.autosize();
  };

  UINotification.prototype.onPushNotificationToggled = function() {
    if ($('#send_push_notification').prop('checked')) {
      $('.push-only').removeClass('hidden');
    } else {
      $('.push-only').addClass('hidden');
    }
    Fliplet.Widget.autosize();
  };

  UINotification.prototype.onAddLinkUpdated = function() {
    if ($('#show_link_provider').prop('checked')) {
      $('#notification-form .link-provider-holder').removeClass('hidden');
    } else {
      $('#notification-form .link-provider-holder').addClass('hidden');
    }
    Fliplet.Widget.autosize();
  }

  UINotification.prototype.refreshCharCount = function($field, charLimit) {
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

  UINotification.prototype.notificationConfigurationIsValid = function() {
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

    var notificationMessage = $('#notification_message').val();
    if (notificationMessage.length > _this.messageCharLimit) {
      configurationIsValid = false;
    }

    if (notificationMessage.length === 0 && !$('#notification_badge').is(':checked')) {
      configurationIsValid = false;
    }

    var notificationScheduleOption = $('#schedule-options > li.active:eq(0)').data('option');
    if (notificationScheduleOption !== 'asap' && notificationScheduleOption !== 'scheduled') {
      configurationIsValid = false;
    }

    if (notificationScheduleOption === 'scheduled') {
      var scheduleDate = moment(new Date($('#datetimepicker').find('input').val()));
      var now = moment();
      if (scheduleDate.diff(now, 'days') < -1) {
        configurationIsValid = false;
      }
    }

    return configurationIsValid;
  };

  UINotification.prototype.initialiseNotificationConfirmationModal = function(e) {
    // @NOTE: Currently not used (copied from legacy UI)

    if (!_this.notificationConfigurationIsValid()) {
      return;
    }
    // Populate notification message
    var notificationMessage = $('#notification_message').val();
    if (notificationMessage === '') {
      $('#notification-summary-not-receive-message').show();
      $('#notification-summary-receive-message').hide();
    } else {
      $('#notification-summary-message').html(notificationMessage);
      $('#notification-summary-not-receive-message').hide();
      $('#notification-summary-receive-message').show();
    }

    // Populate notification badge increment
    if ($('#notification_badge').is(':checked')) {
      $('#notification-summary-badge-not').hide();
    } else {
      $('#notification-summary-badge-not').show();
    }

    // Populate notification schedule
    switch ($('#schedule-options > li.active:eq(0)').data('option')) {
      case 'asap':
        $('#notification-summary-schedule').html('ASAP');
        break;
      case 'scheduled':
        var scheduleDate = moment(new Date($('#datetimepicker').find('input').val()));
        var dateString = scheduleDate.format('Do MMM YYYY');
        var timeString = scheduleDate.format('hh:mm A');
        var timezoneString = $.trim($('label[for=' + $(':input[name=notification_timezone]:checked').attr('id') + ']').text());
        $('#notification-summary-schedule').html('<br/>on ' + dateString + ' at ' + timeString + ' (' + timezoneString + ')');
        break;
    }

    $('#notification-form').attr('data-mode', 'confirm');
    $("body").data("modalmanager").getOpenModals().pop().layout();
  };

  UINotification.prototype.initialiseNotificationConfiguration = function() {
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
    if ($('#notification_message').val() !== '') {
      _this.notificationConfig.data.alert = $('#notification_message').val();
    }
    if ($('#notification_badge').is(':checked') === true) {
      _this.notificationConfig.data.badge = 'Increment';
    }
    if ($('#schedule-options > li.active:eq(0)').data('option') === 'scheduled') {
      _this.notificationConfig.push_time = moment(new Date($('#datetimepicker').find('input').val())).format('YYYY-MM-DDTHH:mm');
      if ($('label[for=' + $(':input[name=notification_timezone]:checked').attr('id') + ']').index('#notification-scheduled .btn-group-vertical label') === 1) {
        _this.notificationConfig.push_time += '+00:00';
      }
    }
  };

  UINotification.prototype.startNotificationSend = function() {
    $('#notification-form').attr('data-mode', 'confirm');
    // Send request
    _this.sendNotification()
      .then(function(response) {
        // Push was successful
        _this.notificationIsSent(response, !!$('#notification_id').val());
      })
      .catch(function(error) {
        // Handle error
        var msg = Fliplet.parseError(error);
        _this.sendErrorMessage = "Error: " + msg;
        _this.notificationIsNotSent();
      });
  };

  UINotification.prototype.cancelNotificationSend = function() {
    $('#notification-form').attr('data-mode', '');
    $('#notifications-tab').attr('data-mode', 'list');
    Fliplet.Widget.autosize();
  };

  UINotification.prototype.sendNotification = function() {
    var notifications = Fliplet.Notifications.init();
    var title = $('#notification_title').val().trim();
    var message = $('#notification_message').val().trim();
    var notification = {};
    var pushNotification;
    var data = {
      title: title,
      message: message
    };

    // Check if page is set for deep linking
    if ($('#show_link_provider').is(':checked') && _this.linkSavedData.action && _this.linkSavedData.action.page) {
      data.navigate = _this.linkSavedData.action;
    }

    notification.data = _.cloneDeep(data);

    if ($('#send_push_notification').is(':checked')) {
      pushNotification = {
        payload: _.cloneDeep(data)
      };

      pushNotification.payload.body = pushNotification.payload.message;
      delete pushNotification.payload.message;

      var targetSubscriptionIDs = _.compact(_.map($('#subscription-ids').val().split(','), function (id) {
        return parseInt(id, 10);
      }));
      if (targetSubscriptionIDs.length) {
        pushNotification.subscriptions = targetSubscriptionIDs;
      }
    }

    notification.pushNotification = _.cloneDeep(pushNotification);
    notification.status = $('[name="notification_status"]:checked').val();

    // Reset progress bar
    $('.notification-summary-sending .progress-bar').width('0%');
    $('#notification-form').attr('data-mode', 'sending');
    Fliplet.Widget.autosize();
    // Set progress bar to UI to provide visual user feedback
    $('.notification-summary-sending .progress-bar').width('90%');

    if (_this.mockedRequest) {
      return new Promise(function(resolve, reject) {
        var mockSuccessResponse = false;
        if (mockSuccessResponse) {
          return resolve({
            "notification": {
              "scope": {},
              "readBy":[],
              "orderAt": moment().toISOString(),
              "id": 43,
              "appId": Fliplet.Env.get('appId'),
              "createdByUserId": Fliplet.Env.get('user').id,
              "status": $('[name="notification_status"]:checked').val(),
              "data" : {
                "title": title,
                "message": message
              },
              "updatedAt": moment().toISOString(),
              "createdAt":moment().toISOString(),
              "deletedAt":null
            }
          });
        }
        return reject({
          message: 'Mocked error response'
        });
      });
    }

    if (!$('#notification_id').val()) {
      return notifications.insert(notification);
    }

    return notifications.update(parseInt($('#notification_id').val(), 10), notification);
  };

  UINotification.prototype.notificationIsSent = function(response, isUpdate) {
    var notification = response.notification;
    var pushNotificationResult = response.pushNotificationsResult;
    var pushNotificationCount = pushNotificationResult && pushNotificationResult.subscriptionsCount
      ? pushNotificationResult.subscriptionsCount
      : 0;

    $('#notification-form').attr('data-mode', 'sent');
    Fliplet.Widget.autosize();
    $('.notification-summary-sending .progress-bar').width('100%');

    var message = isUpdate ? 'Your notification has been updated' : 'Your notification has been sent';
    if (pushNotificationCount) {
      message += ', including up to <strong>' + (pushNotificationCount || _this.subscriptionsCount) + '</strong> push notification(s) sent to registered devices'
    }
    message += '.';

    Fliplet.Modal.alert({
      title: 'Success!',
      message: message
    }).then(function () {
      $('#notification-form').attr('data-mode', '');
      _this.resetNotificationForm();
      return Fliplet.Hooks.run('notificationSent', notification, isUpdate);
    });
  };

  UINotification.prototype.notificationIsNotSent = function() {
    $('#notification-form').attr('data-mode', 'error');
    Fliplet.Widget.autosize();
    $('.notification-summary-sending .progress-bar').width('100%');
    if (!_this.sendErrorMessage.length) {
      _this.sendErrorMessage = 'There was an error sending your notification';
    }
    Fliplet.Modal.alert({
      title: 'Error',
      message: _this.sendErrorMessage
    }).then(function () {
      $('#notifications-tab').attr('data-mode', 'list');
      $('#notification-form').attr('data-mode', '');
    });
  };

  UINotification.prototype.loadNotificationForm = function(notification) {
    loadedNotification = _.cloneDeep(notification);
    $('#notification_id').val(notification.id);
    $('#notification_title').val(notification.data.title);
    $('#notification_message').val(notification.data.message);
    $('#notification-form').attr('data-mode', '');
    $('#show_link_provider').prop('checked', _.has(notification, 'data.navigate'));
    $('#notification_status_' + notification.status).prop('checked', true);
    $('#notification-form [name="notification_status"]').prop('disabled', notification.status === 'published');
    $('#send_push_notification').prop('checked', false);
    $('#send_push_notification').prop('disabled', notification.status === 'published');
    _this.linkData = _.assign(_.cloneDeep(DEFAULT_LINK_DATA), notification.data.navigate);

    _this.onNotificationMessageUpdated();
    _this.onAddLinkUpdated();
    _this.onStatusUpdated();
    _this.onPushNotificationToggled();

    _this.linkProviderInit();
    $('#notification-form .notification-send').html('Review &amp; save notification');
    Fliplet.Widget.autosize();
  };

  UINotification.prototype.resetNotificationForm = function() {
    loadedNotification = null;
    $('#notification_id, #notification_title, #notification_message').val('');
    $('#notification-form').attr('data-mode', '');
    $('#notification-message-preview').addClass('message-empty');
    $('#show_link_provider, #send_push_notification').prop('checked', false);
    $('#notification_status_draft').prop('checked', true);
    $('#notification-form [name="notification_status"], #send_push_notification').prop('disabled', false);
    $('.push-only').removeClass('hidden');

    _this.onNotificationMessageUpdated();
    _this.onAddLinkUpdated();
    _this.onStatusUpdated();
    _this.onPushNotificationToggled();

    _this.linkData = _.cloneDeep(DEFAULT_LINK_DATA);
    _this.linkProviderInit();

    Fliplet.Widget.autosize();
    return false;
  };

  return UINotification;
})();

/***************  END: UINotification  ***************/
/***************  END: UINotification  ***************/
/***************  END: UINotification  ***************/
