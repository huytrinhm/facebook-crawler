"use strict";

function _TabCreateOrFocus(e, t) {
  if (!("undefined" != typeof chrome && "tabs" in chrome)) return !1;
  var n = chrome.tabs;
  n.query({ url: e }, function (o) {
    o.length > 0
      ? n.update(o[0].id, { active: !0 }, function (e) {
          "function" == typeof t && t();
        })
      : n.query({ url: "chrome://newtab/*", status: "complete" }, function (o) {
          o.length > 0
            ? n.update(o[0].id, { url: e, active: !0 }, function (e) {
                "function" == typeof t && t();
              })
            : n.create({ url: e, active: !0 }, function (e) {
                "function" == typeof t && t();
              });
        });
  });
}

function fixOrigin(e) {
  if (w) {
    for (
      var t = 0,
        n = 0,
        o = "https://" + new URL(e.url).hostname,
        a = 0,
        s = e.requestHeaders.length;
      a < s;
      ++a
    ) {
      var r = e.requestHeaders[a].name.toLowerCase();
      if (
        ("referer" === r && (t = 1),
        "origin" === r && (n = 1),
        "origin" === r || "referer" === r)
      ) {
        e.requestHeaders[a].value = o;
        break;
      }
    }
    return (
      0 === t && e.requestHeaders.push({ name: "Referer", value: o }),
      0 === n && e.requestHeaders.push({ name: "Origin", value: o }),
      { requestHeaders: e.requestHeaders }
    );
  }
}

function requestGraphql(vars, fb_dtsg) {
  w = !0;
  var n = "fb_dtsg=" + encodeURIComponent(fb_dtsg);
  return (
    (n += vars.includes("variables")
      ? "&" + vars
      : "&q=" + encodeURIComponent(vars)),
    fetch("https://www.facebook.com/api/graphql/", {
      body: n,
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      credentials: "include",
    })
      .then(function (e) {
        return e.json();
      })
      .then(function (e) {
        return (w = !1), e;
      })
      ["catch"](function (e) {
        return { error: !0 };
      })
  );
}

function getMiddleString(string, left, right) {
  try {
    return string.split(left)[1].split(right)[0];
  } catch (o) {
    return !1;
  }
}

function get_fb_dtsg_and_call(callback) {
  if ("function" == typeof callback) {
    var n = 3e5;
    if (
      g.facebook_init &&
      g.facebook_init_cache_time &&
      new Date().getTime() - g.facebook_init_cache_time < n
    )
      return void callback(g.facebook_init.user, g.facebook_init.token);
    try {
      fetch("https://mbasic.facebook.com/help/229715077154790", {
        credentials: "include",
      })
        .then(function (e) {
          return e.text();
        })
        .then(function (textResponseMbasic) {
          if (textResponseMbasic.includes("fast_switch_site")) {
            var regex =
                /"(https:\/\/m\.facebook\.com\/a\/preferences\.php\?fast_switch_site[a-zA-Z0-9&=\-_%.;]+)"/,
              matches = regex.exec(textResponseMbasic);
            null !== matches &&
              fetch(matches[1], { credentials: "include" })
                .then(function (e) {
                  return e.text();
                })
                .then(function (e) {
                  get_fb_dtsg_and_call(callback);
                });
          } else
            chrome.cookies.get(
              { url: "https://www.facebook.com", name: "c_user" },
              function (c_user) {
                if (null !== c_user) {
                  var uid = c_user.value,
                    fb_dtsg = getMiddleString(
                      textResponseMbasic,
                      'name="fb_dtsg" value="',
                      '" '
                    );
                  (g.facebook_init = { user: uid, token: fb_dtsg }),
                    (g.facebook_init_cache_time = new Date().getTime()),
                    callback(uid, fb_dtsg);
                }
              }
            );
        });
    } catch (o) {}
  }
}

function r(e) {
  var t = 3e5;
  return g.facebook_auth &&
    g.facebook_auth_cache_time &&
    new Date().getTime() - g.facebook_auth_cache_time < t
    ? void e(g.facebook_auth)
    : ((w = !0),
      void get_fb_dtsg_and_call(function (uid, fb_dtsg) {
        fetch("https://business.facebook.com/creatorstudio/home", {
          method: "GET",
          credentials: "include",
        })
          .then(function (e) {
            return e.text();
          })
          .then(function (o) {
            w = !1;
            var a = o.match(/MediaManagerStatics",\[\],{"accessToken":"(.+?)"/);
            if (null !== a) {
              var s = { id: uid, csrf_token: fb_dtsg, access_token: a[1] };
              (g.facebook_auth = s),
                (g.facebook_auth_cache_time = new Date().getTime()),
                e(s);
            }
          });
      }));
}

var g = {};

chrome.browserAction.onClicked.addListener(function () {
  _TabCreateOrFocus(chrome.extension.getURL("fbtools.html"));
});

var w = !1;

chrome.webRequest.onBeforeSendHeaders.addListener(
  fixOrigin,
  {
    urls: [
      "https://*.facebook.com/*/dialog/oauth/confirm*",
      "https://*.facebook.com/ajax/groups/membership/leave.php*",
      "https://*.facebook.com/ajax/mercury/change_read_status.php*",
      "https://*.facebook.com/ajax/mercury/search_context.php*",
      "https://*.facebook.com/ajax/mercury/threadlist_info.php*",
      "https://*.facebook.com/ajax/pages/fan_status.php*",
      "https://*.facebook.com/ajax/profile/removefriendconfirm.php*",
      "https://*.facebook.com/ajax/updatestatus.php*",
      "https://*.facebook.com/api/graphql/*",
      "https://*.facebook.com/api/graphqlbatch/*",
      "https://*.facebook.com/composer/ocelot/async_loader/*",
      "https://*.facebook.com/messaging/save_thread_color/*",
      "https://*.messenger.com/ajax/mercury/change_read_status.php*",
      "https://*.messenger.com/ajax/mercury/search_context.php*",
      "https://*.messenger.com/ajax/mercury/threadlist_info.php*",
      "https://*.messenger.com/api/graphqlbatch/*",
    ],
  },
  ["blocking", "requestHeaders", "extraHeaders"]
);

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  var cmd = msg.cmd.toLowerCase();
  switch (cmd) {
    case "facebook_authentication":
      r(function (t) {
        chrome.tabs.sendMessage(sender.tab.id, {
          cmd: "facebook_authentication_response",
          data: t.access_token,
          user: { id: t.id, csrf_token: t.csrf_token },
        });
      });
      break;
    case "update_fb_origin":
      (w = msg.enable || !1), sendResponse({ success: !0 });
      break;
    case "kount":
      get_fb_dtsg_and_call(function (uid, fb_dtsg) {
        requestGraphql(
          "viewer(){message_threads{count,nodes{customization_info{emoji,outgoing_bubble_color,participant_customizations{participant_id,nickname}},all_participants{nodes{messaging_actor{name,id,profile_picture}}},thread_type,name,messages_count,image,id}}}",
          fb_dtsg
        ).then(function (o) {
          if (o.viewer && o.viewer.message_threads.nodes.length > 0) {
            var a = o.viewer.message_threads.nodes;
            (a = a.filter(function (e) {
              if ("ONE_TO_ONE" === e.thread_type) {
                var t = e.all_participants.nodes;
                return (
                  2 === t.length &&
                  "Facebook User" !== t[0].messaging_actor.name &&
                  "Facebook User" !== t[1].messaging_actor.name
                );
              }
              return !1;
            })),
              a.sort(function (e, t) {
                return t.messages_count - e.messages_count;
              });
            var s = a.slice(0, 15),
              r = [];
            s.map(function (e) {
              var n = e.all_participants.nodes,
                o =
                  n[0].id === uid ? n[1].messaging_actor : n[0].messaging_actor;
              r.push({ count: e.messages_count, name: e.name, user: [o] });
            }),
              chrome.tabs.sendMessage(sender.tab.id, {
                cmd: "kount_response",
                data: {
                  threads: r,
                  total_threads: o.viewer.message_threads.count,
                },
              });
          }
        });
      });
      break;
    case "graphql_req":
      get_fb_dtsg_and_call(function (uid, fb_dtsg) {
        requestGraphql(msg.query, fb_dtsg).then(function (res) {
          chrome.tabs.sendMessage(sender.tab.id, {
            cmd: "graphql_res",
            res,
          });
        });
      });
      break;
    case "fb_dtsg":
      get_fb_dtsg_and_call(function (uid, fb_dtsg) {
        chrome.tabs.sendMessage(sender.tab.id, {
          cmd: "fb_dtsg_res",
          uid,
          fb_dtsg,
        });
      });
      break;
    case "fetch":
      fetch(msg.url, {
        headers: msg.headers,
        credentials: "include",
      })
        .then(function (e) {
          return e.text();
        })
        .then(function (responseText) {
          chrome.tabs.sendMessage(sender.tab.id, {
            cmd: "fetch_res",
            url: msg.url,
            responseText,
          });
        });
      break;
  }
});
