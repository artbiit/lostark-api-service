"use strict";
const bot = BotManager.getCurrentBot();
Device.acquireWakeLock(android.os.PowerManager.PARTIAL_WAKE_LOCK, "");
var scriptName = "remote-kakao";
var config = {
  address: "your address",
  port: 3000,
  packageNames: ["com.kakao.talk"],
  userIds: [0],
};
var RKPlugins = {};
// var pluginDir = new java.io.File(com.xfl.msgbot.utils.SharedVar.Companion.getBotsPath(), "".concat(scriptName, "/plugins"));
// if (!pluginDir.exists())
//     new java.io.File(com.xfl.msgbot.utils.SharedVar.Companion.getBotsPath(), "".concat(scriptName, "/plugins")).mkdir();
// Array.from(pluginDir.listFiles()).forEach(function (file) {
//     return require(file.getAbsolutePath());
// });
var socket = new java.net.DatagramSocket();
var address = java.net.InetAddress.getByName(config.address);
var buffer = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 65535);
var inPacket = new java.net.DatagramPacket(buffer, buffer.length);
var replyActions = new Map();
var profileImages = new Map();
var roomIcons = new Map();
function getBytes(str) {
  return new java.lang.String(str).getBytes();
}
function sendEvent(event, data) {
  var bytes = getBytes(JSON.stringify({ event: event, data: data }));
  var outPacket = new java.net.DatagramPacket(
    bytes,
    bytes.length,
    address,
    config.port
  );
  socket.send(outPacket);
}
function bitmapToBase64(icon) {
  var outStream = new java.io.ByteArrayOutputStream();
  icon.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, outStream);
  var byteArray = outStream.toByteArray();
  try {
    outStream.close();
  } catch (_) {}
  return android.util.Base64.encodeToString(byteArray, 0);
}
var receiveMessage = function (msg) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
  var _q = JSON.parse(msg),
    event = _q.event,
    data = _q.data,
    session = _q.session;
  function sendReply(data) {
    return sendEvent("reply:".concat(session), data);
  }
  Object.keys(RKPlugins).map(function (key) {
    return RKPlugins[key].onEvent(
      { event: event, data: data, session: session },
      sendReply
    );
  });
  switch (event) {
    case "send_text":
      if (
        ((_a = data.userId) === null || _a === void 0
          ? void 0
          : _a.toString()) &&
        data.packageName &&
        data.roomId &&
        data.text
      ) {
        var action =
          (_d =
            (_c =
              (_b = replyActions.get(Number(data.userId))) === null ||
              _b === void 0
                ? void 0
                : _b.get(data.packageName.toString())) === null || _c === void 0
              ? void 0
              : _c.get(data.roomId.toString())) === null || _d === void 0
            ? void 0
            : _d[1];
        if (action) {
          var intent = new android.content.Intent();
          var bundle = new android.os.Bundle();
          var remoteInputs = action.getRemoteInputs();
          for (
            var _i = 0, _r = Array.from(remoteInputs);
            _i < _r.length;
            _i++
          ) {
            var input = _r[_i];
            bundle.putCharSequence(input.getResultKey(), data.text.toString());
          }
          android.app.RemoteInput.addResultsToIntent(
            action.getRemoteInputs(),
            intent,
            bundle
          );
          try {
            action.actionIntent.send(Api.getContext(), 0, intent);
            sendReply(true);
          } catch (_) {
            sendReply(false);
          }
        }
      }
      sendReply(false);
      break;
    case "read":
      if (
        ((_e = data.userId) === null || _e === void 0
          ? void 0
          : _e.toString()) &&
        data.packageName &&
        data.roomId
      ) {
        var action =
          (_h =
            (_g =
              (_f = replyActions.get(Number(data.userId))) === null ||
              _f === void 0
                ? void 0
                : _f.get(data.packageName.toString())) === null || _g === void 0
              ? void 0
              : _g.get(data.roomId.toString())) === null || _h === void 0
            ? void 0
            : _h[0];
        if (action) {
          try {
            action.actionIntent.send(
              Api.getContext(),
              1,
              new android.content.Intent()
            );
            sendReply(true);
          } catch (_) {
            sendReply(false);
          }
        }
      }
      sendReply(false);
      break;
    case "get_profile_image":
      if (
        ((_j = data.userId) === null || _j === void 0
          ? void 0
          : _j.toString()) &&
        data.packageName &&
        data.userHash
      ) {
        var profileImage =
          (_l =
            (_k = profileImages.get(Number(data.userId))) === null ||
            _k === void 0
              ? void 0
              : _k.get(data.packageName.toString())) === null || _l === void 0
            ? void 0
            : _l.get(data.userHash.toString());
        if (profileImage) return sendReply(profileImage);
      }
      sendReply(undefined);
      break;
    case "get_room_icon":
      if (
        ((_m = data.userId) === null || _m === void 0
          ? void 0
          : _m.toString()) &&
        data.packageName &&
        data.roomId
      ) {
        var icon =
          (_p =
            (_o = roomIcons.get(Number(data.userId))) === null || _o === void 0
              ? void 0
              : _o.get(data.packageName.toString())) === null || _p === void 0
            ? void 0
            : _p.get(data.roomId.toString());
        if (icon) return sendReply(icon);
      }
      sendReply(undefined);
      break;
  }
};
function onMessage(data) {
  let msg = data || {};

  msg.id = 0;

  msg.sender = data.author;

  msg.time = new Date().getTime();

  msg.app = {};
  msg.app.packageName = msg.packageName;
  msg.app.userId = config.userIds[0];
  sendEvent("message", msg);
}
// @ts-ignore
var thread = new java.lang.Thread({
  run: function () {
    while (true) {
      socket.receive(inPacket);
      var message = decodeURIComponent(
        String(
          new java.lang.String(
            inPacket.getData(),
            inPacket.getOffset(),
            inPacket.getLength()
          )
        )
      );
      Log.i(message);
      receiveMessage(message);
    }
  },
});
function onStartCompile() {
  replyActions.clear();
  return thread.interrupt();
}
thread.start();
bot.addListener(Event.MESSAGE, onMessage);
function onNotificationPosted(sbn) {
  var _a,
    _b,
    _c,
    _d,
    _e,
    _f,
    _g,
    _h,
    _j,
    _k,
    _l,
    _m,
    _o,
    _p,
    _q,
    _r,
    _s,
    _t,
    _u,
    _v;
  var packageName = sbn.getPackageName();
  var userId = sbn.getUser().hashCode();
  if (
    !config.packageNames.includes(packageName) ||
    !config.userIds.includes(userId)
  )
    return;
  var noti = sbn.getNotification();
  var actions = noti.actions;
  var bundle = noti.extras;
  if (
    !actions ||
    !bundle ||
    bundle.getString("android.template") !==
      "android.app.Notification$MessagingStyle"
  )
    return;
  var senderName = bundle.getString("android.title");
  var roomName =
    (_b =
      (_a = bundle.getString("android.subText")) !== null && _a !== void 0
        ? _a
        : bundle.getString("android.summaryText")) !== null && _b !== void 0
      ? _b
      : senderName;
  var androidText = bundle.get("android.text");
  var content = androidText.toString();
  var containsMention = androidText instanceof android.text.SpannableString;
  var isGroupChat = bundle.getBoolean("android.isGroupConversation");
  var messageBundle = bundle.getParcelableArray("android.messages")[0];
  var senderPerson = messageBundle.get("sender_person");
  var senderHash = senderPerson.getKey();
  var time = messageBundle.getLong("time");
  var roomId = sbn.getTag();
  var logId = java.lang.Long.toString(bundle.getLong("chatLogId"));
  var profileImage = bitmapToBase64(senderPerson.getIcon().getBitmap());
  if (!profileImages.has(userId)) profileImages.set(userId, new Map());
  if (
    !((_c = profileImages.get(userId)) === null || _c === void 0
      ? void 0
      : _c.has(packageName))
  )
    (_d = profileImages.get(userId)) === null || _d === void 0
      ? void 0
      : _d.set(packageName, new Map());
  if (
    !((_f =
      (_e = profileImages.get(userId)) === null || _e === void 0
        ? void 0
        : _e.get(packageName)) === null || _f === void 0
      ? void 0
      : _f.has(senderHash))
  )
    (_h =
      (_g = profileImages.get(userId)) === null || _g === void 0
        ? void 0
        : _g.get(packageName)) === null || _h === void 0
      ? void 0
      : _h.set(roomId, profileImage);
  var roomIcon = bitmapToBase64(bundle.get("android.largeIcon").getBitmap());
  if (!roomIcons.has(userId)) roomIcons.set(userId, new Map());
  if (
    !((_j = roomIcons.get(userId)) === null || _j === void 0
      ? void 0
      : _j.has(packageName))
  )
    (_k = roomIcons.get(userId)) === null || _k === void 0
      ? void 0
      : _k.set(packageName, new Map());
  if (
    !((_m =
      (_l = roomIcons.get(userId)) === null || _l === void 0
        ? void 0
        : _l.get(packageName)) === null || _m === void 0
      ? void 0
      : _m.has(roomId))
  )
    (_p =
      (_o = roomIcons.get(userId)) === null || _o === void 0
        ? void 0
        : _o.get(packageName)) === null || _p === void 0
      ? void 0
      : _p.set(roomId, roomIcon);
  var readAction = undefined;
  for (var _i = 0, _w = Array.from(actions); _i < _w.length; _i++) {
    var action = _w[_i];
    if (
      action.getRemoteInputs() &&
      ["reply", "답장"].includes(action.title.toLowerCase())
    ) {
      if (!replyActions.has(userId)) replyActions.set(userId, new Map());
      if (
        !((_q = replyActions.get(userId)) === null || _q === void 0
          ? void 0
          : _q.has(packageName))
      )
        (_r = replyActions.get(userId)) === null || _r === void 0
          ? void 0
          : _r.set(packageName, new Map());
      if (
        !((_t =
          (_s = replyActions.get(userId)) === null || _s === void 0
            ? void 0
            : _s.get(packageName)) === null || _t === void 0
          ? void 0
          : _t.has(roomId))
      )
        (_v =
          (_u = replyActions.get(userId)) === null || _u === void 0
            ? void 0
            : _u.get(packageName)) === null || _v === void 0
          ? void 0
          : _v.set(roomId, [
              readAction !== null && readAction !== void 0
                ? readAction
                : actions[1],
              action,
            ]);
      onMessage.call(null, {
        room: { name: roomName, id: roomId, isGroupChat: isGroupChat },
        id: logId,
        sender: { name: senderName, hash: senderHash },
        content: content,
        containsMention: containsMention,
        time: time,
        app: { packageName: packageName, userId: userId },
      });
    } else if (["read", "읽음"].includes(action.title.toLowerCase())) {
      readAction = action;
      com.xfl.msgbot.application.service.NotificationListener.Companion.setMarkAsRead(
        packageName,
        roomName,
        action
      );
    }
  }
}
