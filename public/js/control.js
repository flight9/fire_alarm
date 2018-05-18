
const WAIT_SECS = 60;
var seconds = 0, timer = 0;

$(function() {
  $('#btn-captcha').click(function(){
    var mobile = $('#mobile').val();
    if(!validMobile(mobile)) {
      alert('错误: 手机号码格式有误,请更正！');
      return;
    }
    $.ajax({
      url: '/sendsms',
      type: 'post',
      data: {mobile: mobile},
      dataType: 'json',
      success: function(result) {
        $('#btn-captcha').prop('disabled', true);
        timer = setInterval(updateButton, 1000);
        console.log('sendsms:', result);
        if(result.err != 0) {
          alert(result.msg);
        }
      }
    });
  });
});

function validMobile(number) {
  if(!number) return false;
  return (/(^(13\d|15[^4,\D]|17[13678]|18\d)\d{8}|170[^346,\D]\d{7})$/.test(number));
}

function updateButton() {
  seconds++;
  if( seconds< WAIT_SECS) {
    $('#btn-captcha').text('等待('+ (WAIT_SECS-seconds)+ ')s');
  } 
  else {
    seconds = 0; clearInterval(timer);
    $('#btn-captcha').text('发送验证码');
    $('#btn-captcha').prop('disabled', false);
  }
}

function validForm() {
  var mobile = $('#mobile').val();
  var captcha = $('#captcha').val();
  if(!validMobile(mobile)) {
    alert('错误: 手机号码格式有误,请更正！');
    return false;
  }
  
  if(!captcha || captcha.length<4) {
    alert('错误: 验证码格式有误,请更正！');
    return false;
  }
  return true;
}
