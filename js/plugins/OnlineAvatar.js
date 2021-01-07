//=============================================================================
// OnlineAvatar.js
// PUBLIC DOMAIN
// ----------------------------------------------------------------------------
// （これ以前の更新履歴は記録していません）
// 2016/10/25 スイッチ・変数同期時、ツクール上とサーバー上でデータが食い違う不具合を修正しました
// 2016/11/09 同じマップへの場所移動時、アバターが分身するのを修正しました
// 2016/11/14 イベント動的生成プラグイン(EventReSpawn.js)との競合対策
// 2018/10/12 firebaseのデータベース作成方法が変わったので、プラグインヘルプの手順に追記
//=============================================================================

/*:
 * @plugindesc Firebaseを使ってプレイヤーをオンライン同期します。
 * @author くらむぼん
 *
 * @param apiKey
 * @desc FirebaseのapiKey。各自コピペしてきてね
 * @default *******************
 * @type variable
 *
 * @param authDomain
 * @desc FirebaseのauthDomain。各自コピペしてきてね
 * @default **********.firebaseapp.com
 * @type variable
 * 
 * @param databaseURL
 * @desc FirebaseのdatabaseURL。各自コピペしてきてね
 * @default https://**********.firebaseio.com
 * @type variable
 * 
 * @param avatarEvent
 * @desc アバターにコピーするコモンイベントの番号。0でアバター機能そのものをオフ
 * @default 1
 *
 * @param syncSwitchStart
 * @desc 全プレイヤーでオンライン共有するスイッチの番号の始まり。両方0で共有機能そのものをオフ
 * @default 11
 *
 * @param syncSwitchEnd
 * @desc 全プレイヤーでオンライン共有するスイッチの番号の終わり。両方0で共有機能そのものをオフ
 * @default 20
 *
 * @param syncVariableStart
 * @desc 全プレイヤーでオンライン共有する変数の番号の始まり。両方0で共有機能そのものをオフ
 * @default 11
 *
 * @param syncVariableEnd
 * @desc 全プレイヤーでオンライン共有する変数の番号の終わり。両方0で共有機能そのものをオフ
 * @default 20
 *
 * @help
 * 外部のBaaSであるFirebaseと連携して、MMORPGのような
 * オンラインのアバター（プレイヤーキャラ）表示に対応するプラグインです。
 * さらにスイッチ・変数同期機能も付け加えてみました。
 * 
 * 始め方：
 * １．Firebaseの公式サイト(https://console.firebase.google.com/)で、
 * 　　Googleアカウントを(持って無ければ)取得し、「新規プロジェクトを作成」する
 * ２．「ウェブアプリにFirebaseを追加」ボタンを押して
 * 　　apiKey、authDomain、databaseURLをプラグインのパラメータにコピペ
 * ３．左メニューから「Authentication」→上部から「ログイン方法」→「匿名」を有効にする
 * ４．左メニューから「Database」->「またはRealtime Databaseを選択」の中の「データベースを作成」を押す
 * ５．現れた選択肢の中から「テストモードで開始」を選択して、有効にする
 * ６．ゲームを多重起動すると、すべてのプレイヤーのアバターが画面に表示されます！
 * ※テストプレイボタンからは多重起動できないので、Firefoxからindex.htmlを開く
 * 
 * ！注意！
 * 多くの投稿サイトでは安全のためContent Security Policyという機能により
 * Firebaseへのオンライン通信が制限されています。
 * もしあなたがこのプラグインを使ったゲームを投稿する予定がある場合は、
 * その投稿先でこのプラグインが使えるかどうか必ず先に確かめておいてください！
 * 
 * 
 * スイッチ・変数の同期：
 * syncSwitchStart、syncSwitchEnd、syncVariableStart、syncVariableEndの
 * ４つのパラメータで「同期したいスイッチと変数の範囲」を設定します。
 * （初期設定ではスイッチ・変数共に11～20の番号が共有されます）
 * その範囲のスイッチ・変数はオンライン通信によって全プレイヤーで
 * 同じ値が共有されます！これによりアバターを出すだけに留まらず
 * オンラインを利用した様々な種類のゲームを作れる…と思います。
 * 
 * 応用編：
 * 画面に表示されるアバターは、avatarEventで指定した番号のコモンイベントの
 * 「実行内容」を自分自身の実行内容にコピーし、並列処理扱いで実行します。
 * これと下記のプラグインコマンドを組み合わせるとチャットとかも実装できます。
 * 詳しくはサンプル見てね→https://krmbn0576.github.io/rpgmakermv/
 * 
 * プラグインコマンド：
 * online 1 to chat　変数１番の内容を「chat」という名前で送信します。
 * online 1 from chat　「そのアバターが」送信した「chat」を変数１番に代入します。
 * 
 * ライセンス：
 * このプラグインの利用法に制限はありません。お好きなようにどうぞ。
 */


function OnlineManager() {
	throw new Error('This is a static class');
}

function Game_Avatar() {
	this.initialize.apply(this, arguments);
}

(function() {
	'use strict';
	OnlineManager.parameters = PluginManager.parameters('OnlineAvatar');
	OnlineManager.url = 'https://www.gstatic.com/firebasejs/live/3.0/firebase.js';
	OnlineManager.variableRef = null;
	OnlineManager.user = null;
	OnlineManager.syncBusy = false;	//同期接続する瞬間、送信が受信を上書きするのを阻止
	OnlineManager.syncBusyg = false;	//同期接続する瞬間、送信が受信を上書きするのを阻止

	//ネット上からfirebaseファイルを読み込む
	OnlineManager.initialize = function() {
		var script = document.createElement('script');
		script.type = 'text/javascript';
		script.src = this.url;
		script.async = true;
		script.onload = this.awake.bind(this);
		script.onerror = function(e) {
			throw new Error('firebaseの読み込みに失敗しました。F5でやり直してみてください。');
		};
		document.body.appendChild(script);
	};

	//firebaseを起動
	OnlineManager.awake = function() {


		var ps = this.parameters;
		//ps['avatarEvent'] = +ps['avatarEvent'];
		//ps['syncSwitchStart'] = +ps['syncSwitchStart'];
		//ps['syncSwitchEnd'] = +ps['syncSwitchEnd'];
		ps['syncVariableStart'] = +ps['syncVariableStart'];
		ps['syncVariableEnd'] = +ps['syncVariableEnd'];

		try {
			firebase.initializeApp({apiKey: ps['apiKey'], authDomain: ps['authDomain'], databaseURL: ps['databaseURL']});
		} catch(e) {
			throw new Error('apiKeyが正しく設定されていません。ご確認ください。');
		}

		this.auth();
	};

	//firebaseアプリにアクセスして匿名サインイン
	//パスワード認証とかTwitter連携認証でログインさせたい場合はこのメソッドを改造しましょう
	OnlineManager.auth = function() {
		firebase.auth().signInAnonymously().then(this.start.bind(this)).catch(SceneManager.catchException.bind(SceneManager));
	};

	//サインイン完了後
	//オンライン接続のイベント登録に関する記述(xxxRef.on()とか)が書いてある関数はこのメソッドから呼び出すと良さげ
	OnlineManager.start = function(user) {
		this.user = user;

		//再接続時にonDisconnectを張り直す
		var connectedRef = firebase.database().ref('.info/connected');
		connectedRef.once('value', function(data) {
			if (data.val() && OnlineManager.selfRef) OnlineManager.selfRef.onDisconnect().remove();
		});

		//接続が最初のマップ読み込みよりも遅延した時は、今いるマップのオンラインデータを購読
		//if (this.mapExists()) this.connectNewMap();

		if ($gameSwitches) this.startSync();
	};

	//スイッチと変数のオンライン同期の開始
	OnlineManager.startSync = function() {
		if (!this.user) return;
		if (this.parameters['syncVariableStart'] || this.parameters['syncVariableEnd']) {
			if (this.databaseRef) this.databaseRef.off();
			else this.databaseRef = firebase.database().ref('variables');
			OnlineManager.syncBusy = true;
			this.databaseRef.once('value', function(data) {
				OnlineManager.syncBusy = false;
			});
			this.databaseRef.on('child_added', function(data) {
				$gameVariables.setValue(data.key, data.val(), true);
			});
			this.databaseRef.on('child_changed', function(data) {
				$gameVariables.setValue(data.key, data.val(), true);
			});
		}

	};


	//変数が同期範囲内
	OnlineManager.variableInRange = function(variableId) {
		return this.parameters['syncVariableStart'] <= variableId && variableId <= this.parameters['syncVariableEnd'];
	};


	//変数を送信
	OnlineManager.sendVariable = function(variableId, value) {
		if (this.databaseRef && !this.syncBusy && this.variableInRange(variableId)) {
			var send = {};
			send[variableId] = value;
			this.databaseRef.update(send);
		}
	};



	//OnlineManagerを起動
	var _SceneManager_initialize = SceneManager.initialize;
	SceneManager.initialize = function() {
		_SceneManager_initialize.apply(this, arguments);
		OnlineManager.initialize();
	};


	//変数同期
	var _Game_Variables_setValue = Game_Variables.prototype.setValue;
	Game_Variables.prototype.setValue = function(variableId, value, byOnline) {
		_Game_Variables_setValue.call(this, variableId, value);
		if (!byOnline)
		OnlineManager.sendVariable(variableId, this.value(variableId));
	};

	//スイッチ・変数の初期化時に、再同期処理（タイミングはスイッチが代表する）
	var _Game_Switches_initialize = Game_Switches.prototype.initialize;
	Game_Switches.prototype.initialize = function() {
		_Game_Switches_initialize.apply(this, arguments);
		OnlineManager.startSync();
	};

	//オンライン経由でスイッチ・変数が変更された時、デバッグウィンドウ(F9)に反映
	//やや重い処理だが、F9はスマホやブラウザで実行されることはないためこれで大丈夫
	var _Window_DebugEdit_update = Window_DebugEdit.prototype.update;
	Window_DebugEdit.prototype.update = function() {
		_Window_DebugEdit_update.apply(this, arguments);
		this.refresh();
	};

	//プラグインコマンドセーブ
	var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
	Game_Interpreter.prototype.pluginCommand = function(command, args) {
		_Game_Interpreter_pluginCommand.apply(this, arguments);
		if (command.toLowerCase() === 'onlineseve') {
                  this.databaseRef = firebase.database().ref($gameVariables.value(4997));
			var send = {};
			send['4994'] = $gameVariables.value(4994);
			this.databaseRef.update(send);
			var send = {};
			send['4995'] = $gameVariables.value(4995);
			this.databaseRef.update(send);
			var send = {};
			send['4996'] = $gameVariables.value(4996);
			this.databaseRef.update(send);
			var send = {};
			send['4998'] = $gameVariables.value(4998);
			this.databaseRef.update(send);
			var send = {};
			send['4999'] = $gameVariables.value(4999);
			this.databaseRef.update(send);
			var send = {};
			send['5000'] = $gameVariables.value(5000);
			this.databaseRef.update(send);
		}
		if (command.toLowerCase() === 'onlineload') {
			this.databaseRef = firebase.database().ref($gameVariables.value(4997));
//
    this.databaseRef.once('value', function(data) {
    })
			this.databaseRef.on('child_added', function(data) {
				$gameVariables.setValue(data.key, data.val(), true);
			});
			this.databaseRef.on('child_changed', function(data) {
				$gameVariables.setValue(data.key, data.val(), true);
			});

//
		}
	};
 })();
