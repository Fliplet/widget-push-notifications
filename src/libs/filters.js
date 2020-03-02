import { calendarDate, formatDate } from '../libs/date';
import { nl2br } from '../libs/string';

Vue.filter('calendarDate', calendarDate);
Vue.filter('formatDate', formatDate);
Vue.filter('nl2br', nl2br);
