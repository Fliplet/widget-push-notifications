export function getFilterScope(filter) {
  filter = filter || {};

  const column = filter.column;
  let value = filter.value;
  // let path = filter.path;
  let scope = {};
  let arrCond = {};
  let strCond = {};
  let cond = {};

  if (!column || (!value && ['empty', 'notempty'].indexOf(filter.condition) > -1)) {
    return;
  }

  switch (filter.condition) {
    case 'equals': // Equals
      _.set(scope, column, value);
      break;
    case 'notequal': // Not equal
      _.set(scope, column, { $ne: value });
      break;
    case 'oneof': // Is one of
      if (!_.isArray(value)) {
        value = [value];
      }

      _.set(scope, column, { $in: value });
      break;
    case 'notoneof': // Is not one of
      if (!_.isArray(value)) {
        value = [value];
      }

      _.set(scope, column, { $nin: value });
      break;
    case 'contains': // Contains
      arrCond[column] = {
        $contains: [value]
      };
      strCond[column] = {
        $iLike: `%${value}%`
      };
      _.set(scope, '$or', [arrCond, strCond]);
      break;
    case 'notcontain': // Does not contain
      arrCond[column] = {
        $contains: [value]
      };
      strCond[column] = {
        $iLike: `%${value}%`
      };
      _.set(scope, '$and', [{ $not: arrCond }, { $not: strCond }]);
      break;
    case 'empty': // Is empty
      // Column is undefined...
      _.set(scope, '$or', [{ $exists: false }]);

      // ...or an empty string or an empty array
      cond[column] = { $in: ['', []] };
      scope.$or.push(cond);
      break;
    case 'notempty': // Is not empty
      // Column is defined...
      _.set(scope, '$and', [{ $exists: true }]);

      // ...and is not an empty string or an empty array
      cond[column] = { $nin: ['', []] };
      scope.$or.push(cond);
      break;
    case 'gt': // Greater than
      _.set(scope, column, { $gt: value });
      break;
    case 'gte': // Greater than or equal to
      _.set(scope, column, { $gte: value });
      break;
    case 'lt': // Less than
      _.set(scope, column, { $lt: value });
      break;
    case 'lte': // Less than or equal to
      _.set(scope, column, { $lte: value });
      break;
    case 'regex': // Matches regex
      _.set(scope, column, { $regex: value, $options: 'i' });
      break;
    default:
      scope = undefined;
      break;
  }

  return scope;
}
