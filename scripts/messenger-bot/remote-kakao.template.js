"use strict";
// 메신저봇R(Android) 클라이언트 스크립트 템플릿.
//
// 이 파일은 placeholder 형태로 커밋되며, 실제 안드로이드 기기에 배포할 때는
// remote-kakao.js (gitignore 됨) 사본을 사용한다. 자세한 setup 은
// scripts/messenger-bot/README.md 참고.
//
// 원본 출처: pandoli365/remote-kakao 파생, msgbot (com.xfl.msgbot) 런타임 전용.
const bot = BotManager.getCurrentBot();
Device.acquireWakeLock(android.os.PowerManager.PARTIAL_WAKE_LOCK, "");
var scriptName = "remote-kakao";
var config = {
  address: "__SERVER_HOST__",
  port: __SERVER_PORT__,
  packageNames: ["com.kakao.talk"],
  userIds: [0],
  allowedSenders: ["__SENDER_NAME__"], // 본인 카카오 이름. 복수 가능: ["이름1","이름2"]
};
//var RKPlugins = {};
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
// session -> { roomId, packageName }. server 의 reply:${session} 응답을 카톡으로
// 다시 송신할 때 어느 방으로 보낼지 매핑. 5초 TTL 로 자동 청소.
var pendingReplies = {};
function getBytes(str) {
  return new java.lang.String(str).getBytes();
}


function sendEvent(event, data, session) {
  var payload = { event: event, data: data };
  if (session !== undefined) payload.session = String(session);
  var bytes = getBytes(JSON.stringify(payload));
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
  var _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
  var _q = JSON.parse(msg),
    event = _q.event,
    data = _q.data,
    session = _q.session;

  // 서버 → 클라이언트 응답 처리. event 가 'reply:<session>' 형식이면 카톡으로 송신.
  if (typeof event === "string" && event.indexOf("reply:") === 0) {
    var sess = event.substring(6);
    var route = pendingReplies[sess];
    delete pendingReplies[sess];
    if (route && route.roomId && typeof data === "string" && data.length > 0) {
      try {
        bot.send(route.roomId, data, route.packageName);
      } catch (_) {}
    }
    return;
  }

  function sendReply(data) {
    return sendEvent("reply:".concat(session), data);
  }
  switch (event) {
    case "send_text":
      try {
        bot.send(data.roomId, data.text, data.packageName);
        sendReply(true);
      } catch (_) {
      } finally {
        sendReply(false);
      }
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
let count = 0;
let resetInterval = 1000;
let maximumRequest = 3;
let messageId = 0;
const prefixComment = "명령어 사용시 !로 시작해주셔야 합니다.\n예시) !도움말";
function onMessage(data) {
  // Event.MESSAGE: data.author (구형) 또는 data.sender (신형 msgbot)
  // notification 경로: data.sender = { name, hash }
  var _senderObj = data.sender || data.author || {};
  var _senderName = _senderObj.name ? String(_senderObj.name) : "unknown";
  var _senderHash = _senderObj.hash ? String(_senderObj.hash) : _senderName;

  // Event.MESSAGE: data.room = string
  // notification 경로: data.room = { name, id, isGroupChat }
  var _roomName = typeof data.room === "string" ? data.room : (data.room && data.room.name) || "";
  var _roomId = typeof data.room === "string" ? data.room : (data.room && data.room.id) || _roomName;
  var _isGroupChat = typeof data.room === "object" && data.room !== null
    ? data.room.isGroupChat
    : data.isGroupChat;

  // Event.MESSAGE: data.packageName / notification 경로: data.app.packageName
  var _packageName = data.packageName || (data.app && data.app.packageName) || "";

  // Event.MESSAGE: data.isMention / notification 경로: data.containsMention
  var _containsMention = data.isMention !== undefined ? data.isMention : data.containsMention;

  if (!config.allowedSenders.includes(_senderName) && !_roomName.startsWith("◆+!")) {
    return;
  }
  if (data.content === "접두사") {
    bot.send(_roomId, prefixComment, _packageName);
    return;
  }
  if (!data.content.startsWith("!")) {
    return;
  }
  if (count === 1) {
    setInterval(() => {
      count = 0;
    }, resetInterval);
  } else if (count >= maximumRequest) {
    return;
  }
  let msg = {};

  msg.room = {
    id: _roomId,
    name: _roomName,
    isGroupChat: _isGroupChat,
  };

  msg.sender = { name: _senderName, hash: _senderHash };
  msg.content = data.content;
  msg.id = messageId;
  msg.time = new Date().getTime();

  msg.containsMention = _containsMention;

  msg.app = {
    packageName: _packageName,
    userId: config.userIds[0],
  };

  messageId++;
  if (messageId < 0) messageId = 0;

  var session = java.util.UUID.randomUUID().toString();
  // reply:${session} 응답을 받았을 때 어디로 답장할지 매핑.
  pendingReplies[session] = {
    roomId: _roomId,
    packageName: _packageName,
  };
  setTimeout(function () {
    delete pendingReplies[session];
  }, 5000);
  sendEvent("message", msg, session);
}
// @ts-ignore
var thread = new java.lang.Thread({
  run: function () {
    while (true) {
      try {
        inPacket.setLength(buffer.length); // 수신 후 축소된 버퍼를 매번 복원
        socket.receive(inPacket);
        var raw = String(
          new java.lang.String(
            inPacket.getData(),
            inPacket.getOffset(),
            inPacket.getLength()
          )
        );
        var message;
        try {
          message = decodeURIComponent(raw);
        } catch (_) {
          message = raw;
        }
        receiveMessage(message);
      } catch (_) {}
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
