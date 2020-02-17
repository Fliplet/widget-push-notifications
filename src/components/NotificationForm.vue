<template>
  <div>
    <div class="notificaiton-form">
      <div class="container-fluid">
        <div class="row" v-show="steps[step].name === 'configure'">
          <div class="col-md-8 col-md-offset-2">
            <h3>Configure your notification</h3>
            <div class="form-group clearfix">
              <input type="text" class="form-control" v-model="notification.data.title" placeholder="Enter notification title" data-count-selector="#title-count" :maxlength="titleCharacterLimit" required>
              <div class="pull-right" :class="{ 'text-success': titleCharactersRemaining >= 0, 'text-danger': titleCharactersRemaining < 0 }">{{ titleCharactersRemaining }} character<template v-if="titleCharactersRemaining !== 1"></template> left</div>
              <div class="text-danger" v-if="errors.title">{{ errors.title }}</div>
            </div>
            <div class="form-group clearfix">
              <textarea class="form-control" rows="4" v-model="notification.data.message" placeholder="Enter notification message (15 words recommended)" :maxlength="messageCharacterLimit" required></textarea>
              <div class="pull-right"  :class="{ 'text-success': messageCharactersRemaining >= 0, 'text-danger': messageCharactersRemaining < 0 }">{{ messageCharactersRemaining }} character<template v-if="messageCharactersRemaining !== 1"></template> left</div>
              <div class="text-danger" v-if="errors.message">{{ errors.message }}</div>
            </div>
            <div class="form-group clearfix">
              <h3>Add a link</h3>
              <div class="tab-selection">
                <span class="tab" :class="{ 'active': linkAction === '' }" @click="linkAction = ''">No link</span>
                <span class="tab" :class="{ 'active': linkAction === 'screen' }" @click="linkAction = 'screen'">Link to screen</span>
                <span class="tab" :class="{ 'active': linkAction === 'url' }" @click="linkAction = 'url'">Link to web page</span>
              </div>
            </div>
            <div class="clearfix link-providers" v-show="linkAction !== 'none'">
              <div class="form-group" v-show="linkAction === 'screen'">
                <div ref="screenLinkProvider"></div>
                <div class="text-danger" v-if="errors.screenLink">{{ errors.screenLink }}</div>
                <p class="text-center"><a class="btn btn-default" href="#" @click.prevent="previewScreenLink">Preview target screen</a></p>
              </div>
              <div class="form-group" v-show="linkAction === 'url'">
                <div ref="urlLinkProvider"></div>
                <div class="text-danger" v-if="errors.urlLink">{{ errors.urlLink }}</div>
              </div>
            </div>
            <p class="text-center step-summary">
              <a class="btn btn-default" :class="{ 'disabled': saving }" href="#" @click.prevent="cancel">Cancel</a>
              <a class="btn btn-primary" :class="{ 'disabled': saving }" href="#" @click.prevent="nextStep">Select recipients</a><br>
              <a class="btn btn-link" :class="{ 'disabled': saving }" href="#" @click.prevent="save('draft')">Save as draft</a>
            </p>
          </div>
        </div>
        <div class="row" v-if="steps[step].name === 'recipients'">
          <div class="col-md-10 col-md-offset-1">
            <h3>Send notification to...</h3>
            <div class="tab-selection">
              <span class="tab" :class="{ 'active': audience === '' }" @click="audience = ''">All users</span>
              <span class="tab" :class="{ 'active': audience === 'loggedIn' }" @click="audience = 'loggedIn'">Signed in users</span>
              <span class="tab" :class="{ 'active': audience === 'subscriptions' }" @click="audience = 'subscriptions'">Test devices</span>
            </div>
            <template v-if="audience !== 'subscriptions' && filters.length">
              <h4>Recipients must match all of the following</h4>
              <div class="filters" v-for="(filter, index) in filters" :key="index">
                <div class="form-group clearfix">
                  <div class="col-xs-1">
                    <span class="btn btn-circle btn-default" @click="removeFilter(index)"><i class="fa fa-fw fa-minus"></i></span>
                  </div>
                  <div class="col-xs-4">
                    <p><input type="text" class="form-control" placeholder="Field name" v-model="filter.column"></p>
                    <div class="form-inline filter-path">
                      <a v-if="!showFilterPath(filter)" class="add-path" href="#" @click.prevent="addFilterPath(filter)">This field is an object</a>
                      <div v-else class="form-group">
                        <label class="filter-path-label">Path</label>
                        <input type="text" class="form-control" placeholder="e.g. companies[0].name" v-model="filter.path">
                        <i class="fa fa-fw fa-times" @click="removeFilterPath(filter)"></i>
                      </div>
                    </div>
                  </div>
                  <div class="col-xs-3">
                    <label class="select-proxy-display">
                      <select class="hidden-select form-control" v-model="filter.condition">
                        <option value="equals">Equals</option>
                        <option value="notequal">Not equal</option>
                        <option value="oneof">Is one of</option>
                        <option value="notoneof">Is not one of</option>
                        <option value="contains">Contains</option>
                        <option value="notcontain">Does not contain</option>
                        <option value="empty">Is empty</option>
                        <option value="notempty">Is not empty</option>
                        <option value="gt">Greater than</option>
                        <option value="gte">Greater than or equal to</option>
                        <option value="lt">Less than</option>
                        <option value="lte">Less than or equal to</option>
                        <option value="regex">Matches regex</option>
                      </select>
                      <span class="icon fa fa-chevron-down"></span>
                    </label>
                  </div>
                  <div class="col-xs-4">
                    <Filter-Value :type="getFilterValueType(filter)" :value.sync="filter.value"></Filter-Value>
                  </div>
                </div>
              </div>
            </template>
            <template v-if="audience === 'subscriptions'">
              <h4>Subscription IDs</h4>
              <p class="text-center">To test push notifications with individual devices, enter subscription IDs for each device.</p>
              <p><Token-Field :value.sync="subscriptions" placeholder="Separate multiple IDs with commas"></Token-Field></p>
              <p class="help-block text-center">You can find your subscription ID by going to <strong>About this app</strong> in the app on your device.</p>
            </template>
            <div class="col-xs-12 filter-summary">
              <div class="col-xs-8">
                <p v-if="audience !== 'subscriptions'"><a href="#" class="btn btn-default" @click.prevent="addFilter"><i class="fa fa-fw fa-plus"></i> Add filter</a> <a href="#" target="_blank" class="filter-help">How to add data for filtering users</a></p>
              </div>
              <div class="col-xs-4 text-right">
                <p><span class="recipient-count">Estimated: {{ matches.count }} user<template v-if="matches.count !== 1">s</template> <tooltip title="This is an approximation and will depend on the user preference at the time of publish."><i class="fa fa-info-circle"></i></tooltip></span></p>
              </div>
            </div>
            <div class="form-group">
              <h3>Notes</h3>
              <textarea class="form-control" rows="4" v-model="notes" placeholder="(Optional) Add some notes to this notification. Your users will not see this."></textarea>
            </div>
            <p class="text-center step-summary">
              <a class="btn btn-default" :class="{ 'disabled': saving }" href="#" @click.prevent="prevStep">Back</a>
              <a class="btn btn-primary" :class="{ 'disabled': saving }" href="#" @click.prevent="nextStep">Prepare for send</a><br>
              <a class="btn btn-link" :class="{ 'disabled': saving }" href="#" @click.prevent="save('draft')">Save as draft</a>
            </p>
          </div>
        </div>
        <template v-if="steps[step].name === 'schedule'">
          <div class="row">
            <div class="col-md-10 col-md-offset-1">
              <h3>Send notification...</h3>
            </div>
          </div>
          <div class="row">
            <div class="col-md-8 col-md-offset-2">
              <div class="tab-selection">
                <span class="tab" :class="{ 'active': schedule === 'now' }" @click="setSchedule('now')">Now</span>
                <span class="tab" :class="{ 'active': schedule === 'scheduled' }" @click="setSchedule('scheduled')">Later</span>
              </div>
            </div>
          </div>
          <div class="row" v-if="schedule === 'scheduled'">
            <div class="col-md-8 col-md-offset-2 text-center">
              <Datepicker
                :inline="true"
                :monday-first="true"
                :required="true"
                :disabled-dates="disabledDates"
                @changedMonth="autosize"
                @changedYear="autosize"
                @changedDecade="autosize"
                v-model="scheduledAtDate"
              ></Datepicker>
              <Timepicker
                :hour.sync="scheduledAtHour"
                :minute.sync="scheduledAtMinute"
                :timezone.sync="scheduledAtTimezone"
                :date="scheduledAtDate"
              ></Timepicker>
            </div>
          </div>
          <div class="row">
            <h3>Show notification as...</h3>
            <div class="col-md-8 col-md-offset-2">
              <div class="tab-selection">
                <span class="tab tab-checked" :class="{ 'active': notificationHasChannel('in-app') }" @click="toggleNotificationChannel('in-app')">In-app notification</span>
                <span class="tab tab-checked" :class="{ 'active': notificationHasChannel('push') }" @click="toggleNotificationChannel('push')">Push notification</span>
              </div>
            </div>
            <p class="text-center text-danger" v-if="errors.channels">{{ errors.channels }}</p>
          </div>
          <div class="row">
            <div class="col-md-8 col-md-offset-2">
              <p class="text-center step-summary">
                <a class="btn btn-default" :class="{ 'disabled': saving }" href="#" @click.prevent="prevStep">Back</a>
                <a class="btn btn-primary" :class="{ 'disabled': saving }" href="#" @click.prevent="nextStep">Review and send</a><br>
                <a class="btn btn-link" :class="{ 'disabled': saving }" href="#" @click.prevent="save('draft')">Save as draft</a>
              </p>
            </div>
          </div>
        </template>
        <div class="row" v-show="steps[step].name === 'review'">
          <div class="col-md-10 col-md-offset-1">
            <h3>Your notification</h3>
            <template v-if="notificationHasChannel('in-app')">
              <div class="text-center notification-message">
                <strong>{{ notification.data.title }}</strong><br>{{ notification.data.message }}
              </div>
            </template>
            <div class="push-notification-preview" v-if="notificationHasChannel('push')">
              <h4 v-if="notificationHasChannel('in-app')">A push notification will also be sent</h4>
              <p class="text-center"><small class="text-info">Appearance of the notification is subject to users' device, preference and accepting to receive notifications.</small></p>
              <div class="visible-sm-block visible-md-block visible-lg-block" id="notification-message-preview">
                <img :src="getAsset('img/notifications_device_preview_empty.jpg')">
                <div id="notification-preview-home">
                  <img class="app-icon-preview" :src="appIcon">
                  <strong class="app-name">{{ appName }}</strong>
                  <span class="notification-message">
                    <strong>{{ notification.data.title }}</strong><br>{{ notification.data.message }}
                  </span>
                </div>
                <div id="notification-preview-icon-home">
                  <img class="app-icon-preview" :src="appIcon">
                  <strong class="app-name">{{ appName }}</strong>
                </div>
                <div id="notification-preview-lockscreen">
                  <img class="app-icon-preview" :src="appIcon">
                  <strong class="app-name">{{ appName }}</strong>
                  <span class="notification-message">
                    <strong>{{ notification.data.title }}</strong><br>{{ notification.data.message }}
                  </span>
                </div>
                <div id="notification-preview-notification-center">
                  <img class="app-icon-preview" :src="appIcon">
                  <strong class="app-name"></strong>
                  <span class="notification-message">
                    <strong>{{ notification.data.title }}</strong><br>{{ notification.data.message }}
                  </span>
                </div>
              </div>
              <p class="visible-xs-block"><img :src="getAsset('img/notifications_device_preview_mock.jpg')"></p>
            </div>
            <h4>Notifications will be sent to <strong>{{ matches.count }}</strong> user<template v-if="matches.count !== 1">s</template></h4>
            <p class="text-center step-summary">
              <a class="btn btn-default" :class="{ 'disabled': saving }" href="#" @click.prevent="prevStep">Back</a>
              <a class="btn btn-primary" :class="{ 'disabled': saving }" href="#" @click.prevent="send()">Send</a>
            </p>
          </div>
        </div>
        <div class="row" v-if="steps[step].name === 'confirmation'">
          <div class="col-md-10 col-md-offset-1">
            <h3>Confirmation</h3>
            <h4 class="text-success">Your notification is saved!</h4>
            <p class="text-center step-summary">
              <a class="btn btn-primary" href="#" @click.prevent="backToNotifications()">Back to notifications</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import bus from '../libs/bus';
import { getFilterScope } from '../libs/scope';
import { getAssetRoot, getNotification, getNotificationLinkAction } from '../store';
import Tooltip from './Tooltip';
import FilterValue from './FilterValue';
import Timepicker from './Timepicker';
import TokenField from './TokenField';
import Datepicker from 'vuejs-datepicker';
import {
  validate as validateTimezone,
  getOffset as getTimezoneOffset
} from '../libs/timezones';

const defaultFilter = {
  column: '',
  condition: 'equals',
  value: ''
};
const defaultAudience = '';
const defaultScheduledAt = moment().add(2, 'hours');

export default {
  data() {
    return {
      saving: false,
      appName: Fliplet.Env.get('appName'),
      appIcon: this.getAsset('img/app-icon.png'),
      notification: getNotification(),
      titleCharacterLimit: 50,
      messageCharacterLimit: 250,
      instance: null,
      assetRoot: getAssetRoot(),
      step: 0,
      steps: [
        { name: 'configure' },
        { name: 'recipients' },
        { name: 'schedule' },
        { name: 'review' },
        { name: 'confirmation' }
      ],
      validateStep: '',
      linkAction: getNotificationLinkAction(),
      schedule: 'now',
      scheduledAtDate: defaultScheduledAt.clone().startOf('day').toDate(),
      scheduledAtHour: defaultScheduledAt.get('hour'),
      scheduledAtMinute: defaultScheduledAt.get('minute'),
      scheduledAtTimezone: validateTimezone(moment.tz.guess()),
      disabledDates: {
        to: moment().subtract(1, 'days').toDate()
      },
      showScreenPreview: false,
      screenLinkProvider: null,
      urlLinkProvider: null,
      channels: ['in-app', 'push'],
      matches: {
        count: 0,
        subscriptions: 0
      }
    };
  },
  components: {
    Tooltip,
    FilterValue,
    Datepicker,
    Timepicker,
    TokenField
  },
  mounted() {
    this.instance = Fliplet.Notifications.init();
    this.getMatches();
    this.initializeProviders();
    Fliplet.Apps.get().then((apps) => {
      const app = _.find(apps, { id: Fliplet.Env.get('appId') });

      if (!app) {
        return;
      }

      this.appIcon = app.icon;
    });
  },
  computed: {
    titleCharactersRemaining() {
      return this.titleCharacterLimit - this.notification.data.title.length;
    },
    messageCharactersRemaining() {
      return this.messageCharacterLimit - this.notification.data.message.length;
    },
    audience: {
      get() {
        const audience = _.get(this.notification, 'data._metadata.audience', defaultAudience);

        if (!audience) {
          return defaultAudience;
        }

        return audience;
      },
      set(audience) {
        if (['loggedIn', 'subscriptions'].indexOf(audience) < 0) {
          audience = defaultAudience;
        }

        _.set(this.notification, 'data._metadata.audience', audience);
      }
    },
    filters() {
      return _.get(this.notification, 'data._metadata.filters', []) || [];
    },
    subscriptions: {
      get() {
        return _.get(this.notification, 'data._metadata.subscriptions', []) || [];
      },
      set(subscriptions) {
        if (typeof subscriptions === 'string') {
          subscriptions = subscriptions.split(',');
        }

        if (!_.isArray(subscriptions)) {
          subscriptions = [subscriptions];
        }

        subscriptions = _.compact(_.map(subscriptions, (id) => {
          return parseInt(id, 10);
        }));

        _.set(this.notification, 'data._metadata.subscriptions', subscriptions);
      }
    },
    scope() {
      if (this.audience === 'subscriptions') {
        return { flPushSubscriptionId: this.subscriptions || [] };
      }

      let scope = _.compact(_.map(this.filters, getFilterScope));

      return scope.length ? { $or: _.compact(_.map(this.filters, getFilterScope)) } : {};
    },
    scheduledAtTimezoneOffset() {
      return getTimezoneOffset(this.scheduledAtTimezone, this.scheduledAtDate);
    },
    scheduledAt() {
      const timestamp = new Date(
        this.scheduledAtDate.getFullYear(),
        this.scheduledAtDate.getMonth(),
        this.scheduledAtDate.getDate(),
        this.scheduledAtHour,
        this.scheduledAtMinute
      );

      return Math.floor((timestamp.getTime() + this.scheduledAtTimezoneOffset * 6e4) / 1000);
    },
    orderAt() {
      if (this.schedule === 'now') {
        return moment().unix();
      }

      return this.scheduledAt;
    },
    type() {
      if (this.notificationHasChannel('in-app') || !this.notificationHasChannel('push')) {
        return 'in-app';
      }

      return 'push';
    },
    errors() {
      let errors = {};

      if (this.steps[this.step].name !== this.validateStep) {
        return errors;
      }

      switch (this.steps[this.step].name) {
        case 'configure':
          if (!this.notification.data.title) {
            errors.title = 'Please enter a title';
          }

          if (!this.titleCharactersRemaining < 0) {
            errors.title = `Title must be no longer than ${this.titleCharacterLimit} characters`;
          }

          if (!this.notification.data.message) {
            errors.message = 'Please enter a message';
          }

          if (!this.messageCharactersRemaining < 0) {
            errors.message = `Message must be no longer than ${this.messageCharacterLimit} characters`;
          }

          break;
        case 'schedule':
          if (!this.channels.length) {
            errors.channels = 'Please select one or more notification types';
          }

          break;
        default:
          break;
      }

      return errors;
    }
  },
  watch: {
    notification() {
      this.autosize();
    },
    errors() {
      this.autosize();
    },
    step() {
      this.autosize();
    },
    schedule() {
      this.autosize();
    },
    linkAction() {
      this.autosize();
    },
    audience() {
      this.autosize();
      this.getMatches();
    },
    filters() {
      this.autosize();
      _.debounce(this.getMatches, 3000, { leading: true })();
    },
    subscriptions() {
      _.debounce(this.getMatches, 1000, { leading: true })();
    }
  },
  methods: {
    cancel() {
      bus.$emit('set-view', 'list');
    },
    backToNotifications() {
      bus.$emit('set-view', 'list');
      bus.$emit('refresh-list');
    },
    autosize() {
      bus.$emit('autosize');
    },
    stepIsValid() {
      this.validateStep = this.steps[this.step].name;

      if (!_.isEmpty(this.errors)) {
        return false;
      }

      this.validateStep = '';
      return true;
    },
    nextStep() {
      if (!this.stepIsValid()) {
        return;
      }

      this.step = Math.min(this.step + 1, this.steps.length - 1);
    },
    prevStep() {
      this.step = Math.max(0, this.step - 1);
    },
    getAsset(path) {
      return `${this.assetRoot}/${path}`;
    },
    setSchedule(schedule) {
      this.schedule = schedule;
    },
    notificationHasChannel(channel) {
      return _.includes(this.channels, channel);
    },
    addNotificationChannel(channel) {
      if (this.channels.indexOf(channel) === -1) {
        Vue.set(this.channels, this.channels.length, channel);
      }
    },
    removeNotificationChannel(channel) {
      if (this.channels.indexOf(channel) > -1) {
        this.channels.splice(this.channels.indexOf(channel), 1);
      }
    },
    getMatches() {
      if (!this.instance) {
        return Promise.resolve();
      }

      var timestamp = new Date().getTime();

      console.groupCollapsed(timestamp);
      console.log('Filters', this.filters);
      console.log('Scope', this.scope);

      return this.instance.getMatches({
        audience: this.audience,
        scope: this.scope,
        includeMatches: true
      }).then((results) => {
        console.log('Count', results.count);
        console.log('Matches', results.matches);
        console.groupEnd(timestamp);
        this.matches = results;
      });
    },
    toggleNotificationChannel(channel, enable) {
      if (typeof enable !== 'undefined') {
        this[enable ? 'addNotificationChannel' : 'removeNotificationChannel'](channel);
        return;
      }

      this[!this.notificationHasChannel(channel) ? 'addNotificationChannel' : 'removeNotificationChannel'](channel);
    },
    getFilterValueType(filter) {
      switch (filter.condition) {
        case 'empty':
        case 'notempty':
          return 'none';
        case 'oneof':
        case 'notoneof':
          return 'collection';
        case 'equals':
        case 'notequal':
        case 'contains':
        case 'notcontain':
        case 'gt':
        case 'gte':
        case 'lt':
        case 'lte':
        case 'regex':
        default:
          return 'text';
      }
    },
    showFilterPath(filter) {
      return filter.path || filter.showPath;
    },
    addFilterPath(filter) {
      Vue.set(filter, 'showPath', true);
      Vue.set(filter, 'path', '');
    },
    removeFilterPath(filter) {
      filter.showPath = false;
      delete filter.path;
    },
    initializeProviders() {
      this.$refs.screenLinkProvider.innerHTML = '';
      this.screenLinkProvider = Fliplet.Widget.open('com.fliplet.link', {
        selector: this.$refs.screenLinkProvider,
        data: _.get(this.notification, 'data.navigate.action') === 'screen'
          ? _.merge({ options: { hideTransition: true } }, this.notification.data.navigate)
          : {
            action: 'screen',
            page: '',
            transition: 'none',
            options: {
              hideAction: true,
              hideTransition: true
            }
          },
        closeOnSave: false
      });
      this.$refs.urlLinkProvider.innerHTML = '';
      this.urlLinkProvider = Fliplet.Widget.open('com.fliplet.link', {
        selector: this.$refs.urlLinkProvider,
        data: _.get(this.notification, 'data.navigate.action') === 'url'
          ? this.notification.data.navigate
          : {
            action: 'url',
            url: '',
            options: {
              hideAction: true
            }
          },
        closeOnSave: false
      });
    },
    addFilter() {
      this.filters.push(_.clone(defaultFilter));
    },
    removeFilter(index) {
      this.filters.splice(index, 1);
    },
    openScreenPreview() {
      if (!_.get(this.notification, 'data.navigate.page')) {
        Fliplet.Modal.alert({
          message: 'Please select a screen to preview'
        });
        return;
      }

      if (window.parent === window.self) {
        alert('Preview only works in Fliplet Studio'); // eslint-disable-line no-alert
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
            pageId: this.notification.data.navigate.page,
            query: this.notification.data.navigate.query
          }
        }
      });
    },
    previewScreenLink() {
      if (!this.screenLinkProvider || this.linkAction !== 'screen') {
        return;
      }

      this.showScreenPreview = true;
      this.save();
    },
    send() {
      if (this.schedule === 'scheduled') {
        this.save('scheduled');
        return;
      }

      this.save('published');
    },
    save(status) {
      let saveLinkProvider = Promise.resolve();

      if (typeof status === 'undefined') {
        status = this.notification.status || 'draft';
      }

      switch (this.linkAction) {
        case 'screen':
          saveLinkProvider = this.screenLinkProvider;
          this.screenLinkProvider.forwardSaveRequest();
          break;
        case 'url':
          saveLinkProvider = this.urlLinkProvider;
          this.urlLinkProvider.forwardSaveRequest();
          break;
        default:
          break;
      }

      return new Promise((resolve) => {
        saveLinkProvider.then((results) => {
          this.notification.data.navigate = _.get(results, 'data', {});

          switch (this.linkAction) {
            case 'screen':
              this.screenLinkProvider = null;
              break;
            case 'url':
              this.urlLinkProvider = null;
              break;
            default:
              break;
          }

          this.initializeProviders();

          if (this.showScreenPreview) {
            this.showScreenPreview = false;
            this.openScreenPreview();
            return;
          }

          if (!this.stepIsValid()) {
            return;
          }

          _.remove(this.filters, (filter) => {
            return !filter.column || (!filter.value && ['empty', 'notempty'].indexOf(filter.condition) > -1);
          });

          _.merge(this.notification, {
            status: status,
            scope: this.scope,
            type: this.type,
            orderAt: this.orderAt,
            data: {
              scheduledAt: this.orderAt, // @TODO Remove scheduledAt after API is refactored to only use orderAt
              _metadata: {
                filters: this.audience !== 'subscriptions' ? this.filters : [],
                subscriptions: this.subscriptions,
                scheduledAtTimezone: this.scheduledAtTimezone,
                scheduledAt: this.scheduledAt
              }
            }
          });

          let pushNotification = {
            payload: {
              title: this.notification.data.title,
              body: this.notification.data.message,
              icon: 'icon_notification',
              badge: 1,
              priority: 'high',
              custom: {
                customData: this.notification.data.navigate
              }
            }
          };

          if (this.notificationHasChannel('push')) {
            if (this.subscriptions.length) {
              pushNotification.subscriptions = this.subscriptions;
            }

            this.notification.pushNotification = pushNotification;
          }

          this.saving = true;

          if (!_.get(this, 'notification.id')) {
            return this.instance.insert(this.notification).then(resolve);
          }

          return this.instance.update(this.notification.id, _.pick(this.notification, [
            'status',
            'type',
            'data',
            'scope',
            'orderAt',
            'pushNotification'
          ])).then(resolve);
        });
      }).then(() => {
        this.saving = false;
        this.nextStep();
      }).catch((error) => {
        this.saving = false;
        Fliplet.Modal.alert({
          title: 'Error saving notification',
          message: Fliplet.parseError(error)
        });
      });
    }
  }
};
</script>
