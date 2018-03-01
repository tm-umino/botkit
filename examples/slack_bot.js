/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
           ______     ______     ______   __  __     __     ______
          /\  == \   /\  __ \   /\__  _\ /\ \/ /    /\ \   /\__  _\
          \ \  __<   \ \ \/\ \  \/_/\ \/ \ \  _"-.  \ \ \  \/_/\ \/
           \ \_____\  \ \_____\    \ \_\  \ \_\ \_\  \ \_\    \ \_\
            \/_____/   \/_____/     \/_/   \/_/\/_/   \/_/     \/_/


~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

// 各種API設定値
const DOCOMO_API_KEY = "xxxxxxxxxxxxxxxxxx"
const DIALOG_URL = "https://api.apigw.smt.docomo.ne.jp/dialogue/v1/dialogue?APIKEY=" + DOCOMO_API_KEY;
const QA_URL = "https://api.apigw.smt.docomo.ne.jp/knowledgeQA/v1/ask?APIKEY=" + DOCOMO_API_KEY;
const WIKI_API_URL = "https://ja.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro=&explaintext="
const WIKI_URL = "https://ja.wikipedia.org/wiki/"


/**~~~~~~~~~~ おまじない的なものです。理解しなくても大丈夫です ~~~~~~~~~~~~~**/
if (!process.env.token) {
  console.log('Error: Specify token in environment');
  process.exit(1);
}

var Botkit = require('../lib/Botkit.js');
var CronJob = require('cron').CronJob;
var os = require('os');
var request = require('request');

var controller = Botkit.slackbot({
  debug: true,
});

var bot = controller.spawn({
  token: process.env.token
}).startRTM();
/**~~~~~~~~~~~ おまじない ここまで ~~~~~~~~~~~~**/


/**
 * 「こんにちは」「こんちは」とメッセージを送られた時、「こんにちは」と返信
 *  ユーザー情報が保存されていれば名前も返す
 *
 * @param  {[type]} bot     botオブジェクト
 * @param  {[type]} message messageオブジェクト
 * @return {[type]}
 */
controller.hears(['こんにちは', 'こんちは'], 'direct_message,direct_mention,mention', function(bot, message) {

    //メッセージを送ったユーザーを取得
    controller.storage.users.get(message.user, function(err, user) {
        if (user && user.name) {

            //メッセージ返信
            bot.reply(message, 'こんにちは、' + user.name + 'さん');
        } else {
            //メッセージ返信
            bot.reply(message, 'こんにちは:grinning:');
        }
    });
});

/**
 * 「hello」と送られた時、リアクションを返信
 *
 * @param  {[type]} bot     [description]
 * @param  {[type]} message [description]
 * @return {[type]}         [description]
 */
controller.hears(['hello','Hello','HELLO'], 'direct_message,direct_mention,mention', function(bot, message) {

  //リアクションを設定
  bot.api.reactions.add({
      timestamp: message.ts,
      channel: message.channel,
      name: 'grinning',
  //エラー処理
  }, function(err, res) {
      if (err) {
          bot.botkit.log('Failed to add emoji reaction :(', err);
      }
  });

});


/**
 * 「〇〇って呼んで」「私は〇〇と言います」と送られた時、ユーザー情報を保存
 *
 * @param  {[type]} bot     [description]
 * @param  {[type]} message [description]
 * @return {[type]}         [description]
 */
controller.hears(['(.*)って呼んで', '私は(.*)といいます'], 'direct_message,direct_mention,mention', function(bot, message) {

  　//正規表現で「〇〇」(名前)を抜き出す
    var name = message.match[1];

    //ユーザー情報取得
    controller.storage.users.get(message.user, function(err, user) {

        //userが設定されていない場合、設定
        if (!user) {
          user = {
            id: message.user,
          };
        }

        //ユーザーの名前を設定
        user.name = name;

        //ユーザー保存
        controller.storage.users.save(user, function(err, id) {

          //メッセージ返信
          bot.reply(message, 'わかりました。今から ' + user.name + ' と呼びます');
        });
    });
});


/**
 * 「ラーメン」というワードが含まれる時、ラーメンの好みを聞き、回答によって返答を変える
 *
 * @param  {[type]} bot     [description]
 * @param  {[type]} message [description]
 * @return {[type]}         [description]
 */
controller.hears(['ラーメン'], 'direct_message,direct_mention,mention', function (bot, message) {

    bot.reply(message, 'ラーメンいいですよね:grin:');

    // 会話を開始します。
    bot.startConversation(message, function (err, convo) {

        // convo.ask() で質問をします。
        convo.ask('何味が一番好きですか！', [
            {
                pattern: '醤油|しょうゆ', // マッチさせる単語
                callback: function (response, convo) {

                    //マッチした時の処理
                    convo.say('オーソドックスでいいですね！私もよく食べます。'); // メッセージを送信。
                    convo.next(); // convo.next()で、会話を次に進めます。通常は、会話が終了します。
                }
            },
            {
                pattern: '味噌|みそ',
                callback: function (response, convo) {
                    convo.say('北海道で食べたくなりますね！私も好きです。');
                    convo.next();
                }
            },
            {
                pattern: '塩|しお',
                callback: function (response, convo) {
                    convo.say('あっさりしていいですよね！たまに食べたくなります。');
                    convo.next();
                }
            },
            {
                pattern: 'とんこつ|豚骨',
                callback: function (response, convo) {
                    convo.say('豚さん。。');
                    convo.next();
                }
            },
            {
                default: true,
                callback: function (response, convo) {

                    //どのパターンにもマッチしない時の処理
                    convo.say('通ですね！私まだ食べたことがないです。');
                    convo.next(); // 会話を次に進めます。この場合、最初の質問にも戻ります。
                }
            }
        ]);

    })

});


// cron作成
var cron = new CronJob({

  //1分おきに実行
  cronTime: '*/1 * * * *', //
  onTick: function() {
    bot.say({
      //channel設定
      channel: 'general',

      //送るテキスト設定
      text: 'hahaha',

      //ユーザー名設定
      username: 'bot',
      icon_url: ''
    }, function(err) {

      //エラー処理
      if (err) {
        bot.botkit.log(err);
      }
    });
  },
  start: false,
  timeZone: 'Asia/Tokyo'
});

//cron開始
cron.start();




/**~~~~~~~~~~~~~~~~~~~~~~~~~~ APIメソッド ~~~~~~~~~~~~~~~~~~~~~~~~~~**/

/**
 * Docomo知識APIメソッド
 * 質問を渡すと、それに対する答えが返してくれる
 *
 * @param  {[type]}   txt      質問
 * @param  {Function} callback
 * @return {[type]}            質問に対する答え
 */
function requestQAApi(txt, callback) {
  var options = {
    uri: QA_URL + "&q=" + encodeURIComponent(txt),
    headers: {
      "Content-type": "application/json",
    }
  };
  request.get(options, function(error, response, body){
    var res = "";
    if (!error) {
      var json = JSON.parse(body);
      res = json.message.textForDisplay;
    } else {
      res = "わからないです。。"
    }
    callback(res);
  });
}


/**
 * Docomo雑談API
 * 発話テキストを渡すと、それに対する受け答えを返してくれる
 *
 * @param  {[type]}   txt      発話テキスト
 * @param  {Function} callback
 * @return {[type]}            発話に対する受け答え
 */
function requestDialogApi(txt, callback) {
  var options = {
    uri: DIALOG_URL,
    headers: {
      "Content-type": "application/json",
    },
    json: {
      "utt": txt,
      "mode": "dialog"
    }
  };
  request.post(options, function(error, response, body){
    var res = "";
    if (!error) {
      res = body.utt;
    } else {
      res = "よくわかりません";
    }
    callback(res);
  });
}


/**
 * WikiAPI
 * 単語を渡すと、それに対するwikiの見出しを返してくれる
 *
 * @param  {[type]}   txt      単語
 * @param  {Function} callback
 * @return {[type]}            wikiの見出し
 */
function wikiApi(txt, callback) {
  var options = {
    uri: WIKI_API_URL + "&titles=" + encodeURIComponent(txt),
    headers: {
      "Content-type": "application/json",
    }
  };
  request.get(options, function(error, response, body){
    var res = "";
    var content = "";
    if (!error) {
      var json = JSON.parse(body);
      var query = json.query;
      if (query && query.pages) {
        for (var p in query.pages) {
          var content = query.pages[p].extract;

          if (content) {
            // slackで引用スタイルを適用するために`>` をつける
            content = '> ' + content.replace(/\n/g, '\n> ') + '\n' +  WIKI_URL + txt;
          } else {
            content = 'わかりませんでした。';
          }
        }
      } else {
        content = 'わかりませんでした。';
      }
      res = content;
    } else {
      res = 'わかりませんでした。';
    }
    callback(res);
  });
}





/**~~~~~~~~~~~~~~~~~ ここからは各PCのソースからは削除する ~~~~~~~~~~~~~~~~~~~**/


/**
 * wikiAPI連携例
 *
 * @param  {[type]} bot     [description]
 * @param  {[type]} message [description]
 * @return {[type]}         [description]
 */

controller.hears(['(.*)を調べて'], 'direct_message,direct_mention,mention', function(bot, message) {
  var txt = message.match[1];

  controller.storage.users.get(message.user, function(err, user) {
    if (user && user.name) {
      wikiApi(txt, function(res){
        bot.reply(message, res);
      });
    } else {
      wikiApi(txt, function(res){
        bot.reply(message, res);
      });
    }
  });
});

/**
 * Docomo知識API連携例
 *
 * @param  {[type]} bot     [description]
 * @param  {[type]} message [description]
 * @return {[type]}         [description]
 */
controller.hears(['(*)\?','(*)？'], 'direct_message,direct_mention,mention', function(bot, message) {
  var txt = message.match[1];

  controller.storage.users.get(message.user, function(err, user) {
    if (user && user.name) {
      requestQAApi(txt, function(res){
        bot.reply(message, res);
      });
    } else {
      requestQAApi(txt, function(res){
        bot.reply(message, res);
      });
    }
  });
});


/**
 * Docomo雑談API連携例
 *
 * @param  {[type]} bot     [description]
 * @param  {[type]} message [description]
 * @return {[type]}         [description]
 */
controller.hears(['(.*)'], 'direct_message,direct_mention,mention', function(bot, message) {
    var txt = message.match[1];

    controller.storage.users.get(message.user, function(err, user) {
        if (user && user.name) {
            requestDialogApi(txt, function(res){
              bot.reply(message, res);
            });
        } else {
            var res = requestDialogApi(txt, function(res){
              bot.reply(message, res);
            });
        }
    });
});
