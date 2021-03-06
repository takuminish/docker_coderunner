//---- サーバ側プログラムで必要なモジュールをrequireで取り込む
//---- expressを取り込む
var express = require('express');
var app = express();

//---- body-parserを取り込む
var bodyParser = require('body-parser');

//---- child_processを取り込む
var child_process = require('child_process');
var fs = require('fs');

//---- expressで使用するミドルウェアの設定
app.use(express.static('public')); // publicディレクトリを静的ファイルの置き場所として設定
app.use(bodyParser.urlencoded({extended: false})); // 要求本文でURLEncode処理を行う

//---- /api/run APIの設定 
app.post('/api/run', function(req,res){ // POSTメソッドを使用 第１引数URL 第２引数 API要求に対する処理
    var language = req.body.language;       // 提出されたコードのプログラミング言語を取得
    var source_code = req.body.source_code; // 提出されたコードのコード本体を取得
    var input = req.body.input;             // 提出されたコードの入力を取得

    var filename; // ファイル名を格納する変数
    var execCmd;  // コマンドを格納する変数
    
    if (language === 'ruby') {    // 提出されたコードのプログラミング言語がRubyの場合
	filename = 'Main.rb';     // ファイル名をMain.rbに
	execCmd = 'ruby Main.rb'; // 実行するコマンドをruby Main.rbに
    } else if (language === 'python') { // 提出されたコードのプログラミング言語がPythonの場合
	filename = 'Main.py';           // ファイル名をMain.pyに
	execCmd = 'python Main.py';     // 実行するコマンドをpython Main.pyに
    }else if (language === 'c') {                      // 提出されたコードのプログラミング言語がC言語の場合
	filename = 'Main.c';                           // ファイル名をMain.cに
	execCmd = 'cc -Wall -o Main Main.c && ./Main'; // 実行するコマンドをcc -Wall -o Main Main.c && ./Main
    }

    //---- コードを実行するためのDockerコンテナを作成
    var dockerCmd =
	'docker create -i '+  //-iオプションにより標準入出力を有効
	'--net none ' +       // ネットワーク機能を無効　
	'--cpuset-cpus 0 ' +  // CPUコアの0版を利用
	'--memory 512m --memory-swap 512m ' + // 物理メモリ512MBでスワップなし
	'--ulimit nproc=10:10 ' +             // 利用できるプロセスを１０個に制限
	'--ulimit fsize=1000000 ' +           // 作成するファイルサイズを1MBに制限
	'-w /workspace ' +                    // 作業ディレクトリを/workspaceに設定
	'ubuntu-dev ' +                       // コンテナはubutu-devを利用
	'/usr/bin/time -q -f "%e" -o /time.txt ' + // timeコマンド -f%eにより実時間を取得　実行時間はtime.txtに
	'timeout 3 ' +                             //タイムアウト時間を３秒に設定
	'su nobody -s /bin/bash -c "' +            // ユーザをnobodyユーザに切り替える
	execCmd +   // コードを実行するコマンドを指定
	'"';
    console.log("Running: " + dockerCmd);
    var containerId = child_process.execSync(dockerCmd).toString().substr(0,12); // コンテナIDを保存
    console.log("ContainerId: " + containerId);

    //---- コードをコンテナにコピー
    child_process.execSync('rm -rf /tmp/workspace && mkdir /tmp/workspace && chmod 777 /tmp/workspace'); ///tmp/workspaceディレクトリを作成しchmod 777によりパーミッションを変更
    fs.writeFileSync('/tmp/workspace/' + filename, source_code); //提出されたコードをworkspace内に保存
    dockerCmd = "docker cp /tmp/workspace " + containerId + ":/"; // /tmp/workspaceをコンテナにコピー
    console.log("Running: " + dockerCmd);
    child_process.execSync(dockerCmd);

    //---- コンテナを実行
    dockerCmd = "docker start -i " + containerId; //-iオプションにより出力を受け取れるようにする
    console.log("Running: " + dockerCmd);
    var child = child_process.exec(dockerCmd,{}, function(error,stdout, stderr){
	//---- 実行時間をコンテナの中の/time.txtから取得
	dockerCmd = "docker cp " + containerId + ":/time.txt /tmp/time.txt"; // コンテナの中からホストにコピー
	console.log("Running: " + dockerCmd);
	child_process.execSync(dockerCmd);
	var time = fs.readFileSync("/tmp/time.txt").toString();

	//---- コンテナを削除
	dockerCmd = "docker rm " + containerId;
	console.log("Running: " + dockerCmd);
	child_process.execSync(dockerCmd);

	console.log("Result: ", error, stdout, stderr);
	res.send({
	    stdout: stdout,
	    stderr: stderr,
	    exit_code: error && error.code || 0,
	    time: time,
	});
    });
    child.stdin.write(input); // 入力を渡す処理
    child.stdin.end();        // 入力が終わったことを示す処理
});

//---- 待ち受けポートの指定
app.listen(3000, function(){
    console.log('Listening on port 3000');
});
	
