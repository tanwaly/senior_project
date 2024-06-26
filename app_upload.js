const express = require('express');
const path = require('path');
const upload = require('./config/upload');

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use("/public", express.static(path.join(__dirname, "public")));

app.post('/uploading',function(req,res){
    upload(req,res,function(err){
        if(err){
            return res.status(500).send('Upload error');
        }
        res.send('Upload done');
    })
})

upload(req,res,function(err){
    if(err){
        console,error(err);
        return res.status(500).send('Upload error');
    }
    console.log
})

app.get('/upload',function(req,res){
    res.sendFile(path.join(__dirname,'views/upload.html'));
})

const PORT = 3000;
app.listen(PORT, function () {
    console.log('Server is runnint at port ' + PORT);

});