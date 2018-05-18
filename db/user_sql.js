var userSQL = {  
  create:'INSERT INTO users(mobile,openid) VALUES(?,?)', 
  queryAll:'SELECT * FROM users',  
  getUserByOpenid:'SELECT * FROM users WHERE openid = ?', 
  getUserByMobile:'SELECT * FROM users WHERE mobile = ? ', 
  getUsersByMobile:'SELECT * FROM users WHERE mobile IN (?) OR super>0', 
  delUserByMobile:'DELETE FROM users WHERE mobile = ? ',
};
module.exports = userSQL;