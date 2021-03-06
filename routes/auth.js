const express = require('express');
const passport = require('passport');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { isLoggedIn, isNotLoggedIn } = require('./middlewares');
const { User } = require('../models');
const client = require('../cache_redis');

const router = express.Router();


function createEmailkey(nickname, email){
  var emailKey = crypto.randomBytes(256).toString('hex').substr(100, 5);
  client.set(emailKey, nickname, "EX", 60*60*24, function(err, response){
      console.log(response);
  });


  var smtpTransport = nodemailer.createTransport({
    service : 'gmail',
    auth : {
      user : process.env.GMAIL_ID,
      pass : process.env.GMAIL_PASS,
    }
  });

  var url = 'http://localhost:8002/test/confirmEmail_test'+'?key='+emailKey;
  var mailOpt = {
    from : process.env.GMAIL_ID,
    to : email,
    subject : 'Emial verify',
    html : '<h1>For verifing, Please click the link</h1><br>' + url
  };

  smtpTransport.sendMail(mailOpt, function(err, res){
    if(err){
      console.log(err);
    }


    else{
      console.log('email has been sent');
    }

    console.log('success email')
    smtpTransport.close();

  });


}

router.post('/join', isNotLoggedIn, async (req, res, next) => {
  const { email, nickname, password } = req.body;
  try {
    const exUser = await User.findOne({ where: { email } });
    if (exUser) {
      res.render('map',{joinError: '이미 가입된 이메일입니다.'});
    }
    
   // let salt = Math.round((new Data().valueOf() * Math.random())) + "";
    //const hash = await bcrypt.hash(password, 12); //여기에 SALT를 써야함
    salt = "asgdasg";
    let hash = crypto.createHash("sha512").update(password + salt).digest("hex");
    await User.create({
      email,
      nickname,
      password: hash,
      salt : salt,
    });

/*
    createEmailkey(nickname, email);
*/
    //임시 만료기간을 닉네임을 통해 확인
    client.set(nickname, 60*60*24, "EX", 60*60*24, function(err, response){
    console.log(response);
  });


    return res.redirect('/');
  } catch (error) {
    console.error(error);
    return next(error);
  }
});



router.get('/confirmEmail',function (req, res) {
  client.get(req.query.key, function(err, response){
    if(response !== null){
      User.update({status : 2}, {where : {nickname : response}});
      client.del(req.query.key);
      return res.status(200).send();
    }

    else{
      return res.status(400).send();
    }
    
  });
});



router.post('/login', isNotLoggedIn, (req, res, next) => {
    passport.authenticate('local', (authError, user, info) => {
    if (authError) {
      console.error(authError);
      return next(authError);
    }
    /*
    if (!user) {
      req.flash('loginError', info.message);
      return res.redirect(400, '/');
    }
    */
    return req.login(user, (loginError) => {
      /*
      if (loginError) {
        console.error(loginError);
        return next(loginError);
      }
      */

      //이메일 인증링크가 만료됬을시에
      /*
      if(!client.get(nickname)){
        createEmailkey(user.nickname, user.email);
        return res.status(400).json({
          code : 400,
          messgae : '이메일 인증을 해주세요!',
      });
      }
      */

      //로그인에 성공했으면 JWT 토큰 줘버리기
      try{
        const token = jwt.sign({
            id : user.id,
            nickname : user.nickname,
            status : user.status,
        },
        process.env.JWT_SECRET,
        {
            expiresIn : '1m',
            issuer : 'nodebird',
        }
        );

        //refresh token 추가
        const refreshToken = jwt.sign({
              id : user.id,
              nickname : user.nickname,
              user : user.status,
          },
          process.env.JWT_SECRET,
          {
              expiresIn : '60m',
              issuer : 'nodebird',
          }
        );

        //캐쉬에 등록
        client.set(refreshToken, token, "EX", 60*60);



        return res.json({
            code : 200,
            message : '토큰이 발급되었습니다.',
            token,
            refreshToken,
        });
    }

    catch(error){
        console.error(error);
        return res.status(500).json({
            code : 500,
            messgae : '서버 에러',
        });
    }
    
    });
    
    return res.status(200);

  })(req, res, next); // 미들웨어 내의 미들웨어에는 (req, res, next)를 붙입니다.
});


router.get('/logout', isLoggedIn, (req, res) => {
  req.logout();
  req.session.destroy();
  res.redirect('/');
});

router.get('/google', passport.authenticate('google', { scope: [ 'profile', 'email' ]}));

router.get('/google/callback', passport.authenticate('google', {
  failureRedirect: '/',
}), (req, res) => {
  res.redirect('/');
});

router.get('/kakao', passport.authenticate('kakao'));

router.get('/kakao/callback', passport.authenticate('kakao', {
  failureRedirect: '/',
}), (req, res) => {
  res.redirect('/');
});

module.exports = router;