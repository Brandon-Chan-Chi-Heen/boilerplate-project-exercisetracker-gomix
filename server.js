const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

// setting up mongodb
const mongoose = require('mongoose');
mongoose.connect(process.env.DB_URI, { useNewUrlParser: true, useUnifiedTopology: true});


// express route setup
app.use(cors())
app.use(express.static('public'))
app.use("/api/users", express.urlencoded({extended: true}));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// setting up mongodb schema and stuffs
var exerciseSchema = new mongoose.Schema({
  username: {type: String, unique: true},
  count: Number,
  log: [{
    _id: false,
    description: String,
    duration: Number,
    date: Date
  }]
})

var Exercise = mongoose.model('Exercise', exerciseSchema)

const createUser = (username, done) => {
  let save_user = new Exercise({
    username: username,
    count: 0,
    log: []
  })

  save_user.save(function(err, data){
    if(err){
      if (err.name === 'MongoError' && err.code === 11000) {
        done(err, data);
        return;
      }
      console.log(`
        +------------------------------------------------------
        | Error occured when saving newly created data
        +------------------------------------------------------
        Error: ${err}
        
        Data: ${data}

        username : ${username}
      `)
      return;
    }
    done(null, data);
  })
}

const findUserById = (userId, done) => {
  Exercise.findById(userId, function(err, data){
    if(err){
      console.log(`
        +------------------------------------------------------
        | Error occured on finding user id
        +------------------------------------------------------
        Error: ${err}
        
        Data: ${data}

        username : ${userId}
      `)
    }
    done(null, data);
  })
}

const addExercise = (userId, exerciseDetails, done) => {
  console.log("exerciseDetails : ", exerciseDetails);
    findUserById(userId, function(err, userData){
      if(err){
        console.log(`
          +------------------------------------------------------
          | Error occured on finding user id to add user exercise
          +------------------------------------------------------
          Error: ${err}
          
          Data: ${userData}

          username : ${userId}

          exercise Details: ${exerciseDetails}`)
      }
      userData.count += 1;
      userData.log.push(exerciseDetails);
      userData.save((err, data) => {
        if (err){
          console.log(`
            +------------------------------------------------------
            | Error occured on finding user id to add user exercise
            +------------------------------------------------------
            Error: ${err}
            
            Data: ${userData}

            username : ${userId}

            exercise Details: ${exerciseDetails}
          `)
        }
        done(null, data);
      })
    })
}

const retrieveLogs = (startDate, endDate, userId, done, docLimit = 0) => {
  Exercise.find({_id: userId, 
    log : { 
      $elemMatch: {
        date: { 
          $gte: startDate, $lte:endDate
        }
      }
    }
  })
  .limit(docLimit)
  .exec(function(err, data){
    if(err){
      console.log(`
          +------------------------------------------------------
          | Error occured on retrieving logs
          +------------------------------------------------------
          Error: ${err}
          
          Data: ${data}

          userid : ${userId}

          startDate and end date: ${startDate}, ${endDate}
          +------------------------------------------------------`)
    }
    done(null, data);
  });
}

const getAllUsers = (done) => {
  Exercise.find({})
    .select('_id username __v')
    .exec(function(err, allRecords){
      if(err){
        console.log("error selecting all records")
        return
      }
      done(null, allRecords);
  })
}

// setting up post routes

app.post("/api/users", function(req, res){
  let username = req.body.username;
  
  if( username == ''){
    res.send("Path `username` is required.")
    return;
  }
  createUser(username, function(err, data){
    if(err){
      console.log("duplicate Username");
      return res.send('Username already taken');
    }
    res.json({username: data.username, _id: data._id});
  })
})

app.post("/api/users/:_id/exercises", function(req, res, next){
  let userId = req.params._id;
  let addExerciseObj = req.body
  delete addExerciseObj[':_id'];
  let {desc, dura, date} =  addExerciseObj;

  if(userId == ''){
    next()
  }
  if( desc == ''){
    res.send("Path `description` is required.")
    return;
  }
  else if( dura == ''){
    res.send("Path `duration` is required.")
    return;
  }
  else if(date == ''){
    // validate 
    addExerciseObj.date = new Date().toLocaleDateString("en-US", {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).replace(/,/g, '')
  }

  addExercise(userId, addExerciseObj, function(err, data){
    console.log(data);
    if(err){
      console.log(`
          +------------------------------------------------------
          | Error occured at adding exercise in route  
          +------------------------------------------------------
          Error: ${err}
          
          Data: ${data}

          userid : ${userId}
          ------------------------------------------------------`)
          return
    }
    res.json(data)
  })
})


// 'get' route handlers
app.get('/api/users', function(req, res){
  getAllUsers(function(err, data){
    if(err){
      console.log("Error on getting all user data");
      return
    }
    res.json(data);
  })
})

app.get('/api/users/:_id/logs', function(req, res){
  let userId = req.params._id;
  let {startDate, endDate, limit} = req.query 
  retrieveLogs(startDate, endDate, userId, function(err, data){
    if(err){
      console.log('error retrieving documents at server.js');
      return
    }
    res.json(data);
  }, limit);
})

// default route handler if all else fails
app.use('*', function(req, res){
  res.send('not found');
})


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
