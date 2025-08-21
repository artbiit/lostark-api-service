function sleep(time) {
  return new Promise(function (resolved) {
    setTimeout(function () {
      resolved();
    }, time);
  })
    .then()
    .catch();
}

/* Boolean ::: String-Object.IsNullOrWhiteSpace () */
String.prototype.IsNullOrWhiteSpace = function () {
  var arg = arguments[0] === undefined ? this.toString() : arguments[0];
  if (arg === undefined || arg === null) {
    return true;
  } else {
    var isWhiteSpace = /^\s*$/;
    if (typeof arg != "string") {
      throw "Property or Arguments was not 'String' Types";
    }
    return isWhiteSpace.test(arg.trim());
  }
};

/* Boolean ::: String.IsNullOrWhiteSpace (String arg) */
String.IsNullOrWhiteSpace = function (arg) {
  if (arg === undefined || arg === null) {
    throw "Property or Arguments was Never Null";
  } else {
    if (typeof arg != "string") {
      throw "Property or Arguments was not 'String' Types";
    }
    return arg.IsNullOrWhiteSpace();
  }
};

function IsNullOrWhiteSpace(arg) {
  if (arg === undefined || arg === null) {
    throw "Property or Arguments was Never Null";
  } else {
    if (typeof arg != "string") {
      throw "Property or Arguments was not 'String' Types";
    }
    return arg.IsNullOrWhiteSpace();
  }
}

function removeHtmlTag(html) {
  return html.replace(/<[^>]*>?/g, "");
}

const times = [
  { name: "년", milliSeconds: 60 * 60 * 24 * 365 },
  { name: "개월", milliSeconds: 60 * 60 * 24 * 30 },
  { name: "일", milliSeconds: 60 * 60 * 24 },
  { name: "시간", milliSeconds: 60 * 60 },
  { name: "분", milliSeconds: 60 },
];

function elapsedTime(date) {
  const start = new Date(date);
  const end = new Date();

  const diff = (end - start) / 1000;

  for (const value of times) {
    const betweenTime = Math.floor(diff / value.milliSeconds);

    if (betweenTime > 0) {
      return `${betweenTime}${value.name} 전`;
    }
  }
  return "방금 전";
}

function remainingTime(date, start) {
  const end = new Date(date);
  if (!start) {
    start = new Date();
  }
  const diff = (end - start) / 1000;
  for (const value of times) {
    const betweenTime = Math.floor(diff / value.milliSeconds);

    if (betweenTime > 0) {
      return `${betweenTime}${value.name} 후`;
    }
  }
  return `${diff}초 후`;
}

function dayToString(date) {
  const days = {
    0: "일요일",
    1: "월요일",
    2: "화요일",
    3: "수요일",
    4: "목요일",
    5: "금요일",
    6: "토요일",
  };
  return days[date.getDay()];
}

module.exports = {
  sleep,
  IsNullOrWhiteSpace,
  removeHtmlTag,
  elapsedTime,
  times,
  remainingTime,
  dayToString,
};
