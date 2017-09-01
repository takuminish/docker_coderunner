//---- 実行処理
function runCode() {
    $("#run_button").text("実行中...").prop("disabled", true);  //ボタンのテキストを実行中...に変更し、ボタンを押せないようにする

    var language = $("#language").val();    // 言語を読み込む
    var source_code = aceEditor.getValue(); // ソースコードを読み込む
    var input = $("#input").val();          // 入力を読み込む

    //---- ajaxを利用してサーバAPIに言語、コード、入力を送信
    $.ajax({
	url: "/api/run",
	method: "POST",
	data: {
	    language: language,
	    source_code: source_code,
	    input: input,
	},
    //---- 実行結果を取得しHTMLに反映
    }).done(function(result){
	$("#stdout").text(result.stdout);
	$("#stderr").text(result.stderr);
	$("#time").text(result.time);
	$("#exit_code").text(result.exit_code);
	$("#run_button").text("実行(Ctrl-Enter)").prop("disabled", false);
    //---- 失敗した時はエラーメッセージを表示
    }).fail(function(error){
	alert("Request Failed:" + error);
	$("#run_button").text("実行(Ctrl-Enter)").prop("disabled", false);
    });
}
