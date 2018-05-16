var userSQL = {  
  insert:'INSERT INTO users(username,password,date,type,openid) VALUES(?,?,?,?,?)', 
  queryAll:'SELECT * FROM users',  
  getUserByMobile:'SELECT * FROM users WHERE mobile = ? ', 
  getUsersByMobile:'SELECT * FROM users WHERE mobile IN (?)', 
  delUserByMobile:'DELETE FROM users WHERE mobile = ? ',
};
module.exports = userSQL;