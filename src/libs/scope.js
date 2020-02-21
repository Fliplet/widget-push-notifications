export function getFilterScope(filter) {
  filter = filter || {};

  const column = filter.column;
  let value = filter.value;
  let path = filter.path;
  let scope = {};
  let result = scope;

  if (!column || (!value && ['empty', 'notempty'].indexOf(filter.condition) < 0)) {
    return;
  }

  if (path) {
    _.set(scope, column, {});
    scope = result[column];
  } else {
    path = column;
  }

  if (['oneof', 'notoneof'].indexOf(filter.condition) < 0 && _.isArray(value)) {
    value = value[0];
  }

  switch (filter.condition) {
    case 'equals': // Equals
      _.setWith(scope, path, value, Object);
      break;
    case 'notequal': // Not equal
      _.setWith(scope, path, { $ne: value }, Object);
      break;
    case 'oneof': // Is one of
      if (!_.isArray(value)) {
        value = [value];
      }

      _.setWith(scope, path, { $in: value }, Object);
      break;
    case 'notoneof': // Is not one of
      if (!_.isArray(value)) {
        value = [value];
      }

      _.setWith(scope, path, { $notIn: value }, Object);
      break;
    case 'contains': // Contains
      _.setWith(scope, path, {
        $or: [{ $iLike: { $any: [value] } }, { $iLike: `%${value}%` }]
      }, Object);
      break;
    case 'notcontain': // Does not contain
      _.setWith(scope, path, {
        $and: [{ $notILike: { $any: [value] } }, { $notILike: `%${value}%` }]
      }, Object);
      break;
    case 'empty': // Is empty
      _.setWith(scope, path, {
        $or: [{ $eq: null }, { $in: ['', '[]'] }]
      }, Object);
      break;
    case 'notempty': // Is not empty
      _.setWith(scope, path, {
        $and: [{ $ne: null }, { $notIn: ['', '[]'] }]
      }, Object);
      break;
    case 'gt': // Greater than
      _.setWith(scope, path, { $gt: value }, Object);
      break;
    case 'gte': // Greater than or equal to
      _.setWith(scope, path, { $gte: value }, Object);
      break;
    case 'lt': // Less than
      _.setWith(scope, path, { $lt: value }, Object);
      break;
    case 'lte': // Less than or equal to
      _.setWith(scope, path, { $lte: value }, Object);
      break;
    default:
      scope = undefined;
      break;
  }

  return result;
}
