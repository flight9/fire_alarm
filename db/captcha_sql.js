var SQL = {  
  create:'INSERT INTO captchas(mobile,captcha,expire) VALUES(?,?,?)', 
  update:'UPDATE captchas SET captcha=?, expire=? WHERE mobile=?', 
  upsert:'INSERT INTO captchas(mobile,captcha,expire) VALUES (?,?,?) ON DUPLICATE KEY UPDATE captcha=?,expire=?', 
  queryAll:'SELECT * FROM captchas',
  getByMobile:'SELECT * FROM captchas WHERE mobile=?',
  delExpire:'DELETE FROM captchas WHERE expire<unix_timestamp()',
};
module.exports = SQL;