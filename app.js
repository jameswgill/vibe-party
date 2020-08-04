var express = require('express'); // Express web server framework
var fs = require('fs');

var options = {
    key: fs.readFileSync('./dir/server.key'),
    cert: fs.readFileSync('./dir/server.cert')
};


var app = express();
var https = require("https")

var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var request = require('request')
app.use(express.json())

var client_id = ''
var client_secret = ''; // Your secret
var redirect_uri = ''; // Your redirect uri

var serverPort = 9999;
var server = https.createServer(options, app)
var io = require('socket.io')(server);

console.log(redirect_uri)

app.set('view engine', 'ejs')


var generateRandomString = function (length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

var stateKey = 'spotify_auth_state';

app.use(express.static(__dirname + '/public'))
    .use(cors())
    .use(cookieParser());


app.get('/', (req,res) => {
    res.render('./public/index.html')
});



app.get('/login', function (req, res) {

    var state = generateRandomString(16);
    res.cookie(stateKey, state);

    // your application requests authorization
    var scope = 'user-read-private user-read-email user-read-playback-state user-modify-playback-state user-read-currently-playing';
    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: client_id,
            scope: scope,
            redirect_uri: redirect_uri,
            state: state
        }));
});


app.get('/callback', function (req, res) {


    var code = req.query.code || null;
    var state = req.query.state || null;
    var storedState = req.cookies ? req.cookies[stateKey] : null;

    if (state === null || state !== storedState) {
        res.redirect('/#' +
            querystring.stringify({
                error: 'state_mismatch'
            }));
    } else {
        res.clearCookie(stateKey);
        var authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            form: {
                code: code,
                redirect_uri: redirect_uri,
                grant_type: 'authorization_code'
            },
            headers: {
                'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
            },
            json: true
        };

        request.post(authOptions, function (error, response, body) {
            if (!error && response.statusCode === 200) {

                var access_token = body.access_token,
                    refresh_token = body.refresh_token;

                var options = {
                    url: 'https://api.spotify.com/v1/me',
                    headers: { 'Authorization': 'Bearer ' + access_token },
                    json: true
                };

                // use the access token to access the Spotify Web API
                request.get(options, function (error, response, body) {
                    console.log(body.email + " has been authenticated");
                });

                // we can also pass the token to the browser to make requests from there


                var options = {
                    maxAge: 1000 * 60 * 60, // would expire after 15 minutes
                    httpOnly: false, // The cookie only accessible by the web server 
                }

                res.cookie('accessToken', access_token, options) // options is optional
                res.cookie('refreshToken', refresh_token, options)

                res.redirect('/#' + 'login=true')

                //res.redirect('/#' +
                //    querystring.stringify({
                //        access_token: access_token,
                //        refresh_token: refresh_token
                //    }));
        

            } else {
                res.redirect('/#' +
                    querystring.stringify({
                        error: 'invalid_token'
                    }));
            }
        });
    }
});


app.get('/getDID', async function (req,res)
{
    var access_token = req.cookies.accessToken

    var headers = {
        'Authorization': 'Bearer ' + access_token
    };
    var options = {
        url: 'https://api.spotify.com/v1/me/player/devices',
        headers: headers,
        json: true,
    };

    function final(value) {
        var activedevice = value
    }
    const callback = (error, response, body) => {
        if (!error && response.statusCode == 200) {
            var devices = {}
            for (i = 0; i < body.devices.length;i++){
                devices[body.devices[i].name] = body.devices[i].id
            }

            var res_send = {
                devicelist: devices
            }

            return res.send(res_send)


        } else {
            console.log(error)
        }
    }

    request(options,callback)
    return 
})


app.get('/getUserInfo', async function (req, res){

    var access_token = req.cookies.accessToken
    var refresh_token = req.cookies.refreshToken
    
    var headers = {
        'Authorization': 'Bearer ' + access_token
    }

    var options = {
        url: 'https://api.spotify.com/v1/me',
        method: 'GET',
        headers: headers,
        json: true,
    }

    async function callback(error, response, body){
        if (!error && response.statusCode == 200){

            if (body.display_name){
                var name = body.display_name
            } else {
                var name = body.id
            }

            if (body.images[0]){
                var image = body.images[0].url;
            } else {
                var image = ''
            }

            var res_send = {
                name: name,
                imageURL: image
            }

            return res.send(res_send)
            

        } else {
            console.log("Error: " + error)
            return null
        }
    }

    request(options, callback)
})


app.get('/getPlayingInfo', async function (req, res) {

    var access_token = req.cookies.accessToken
    var refresh_token = req.cookies.refreshToken

    var headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + access_token
    };

    var options = {
        url: 'https://api.spotify.com/v1/me/player/currently-playing',
        headers: headers
    };

    function callback(error, response, body) {
        if (!error && response.statusCode == 200) {
            var result = JSON.parse(body)

            var res_send = {
                imageUrl: result.item.album.images[0].url,
                albumName: result.item.album.name,
                songName: result.item.name,
                artistName: result.item.artists[0].name,
                uri: result.item.uri,
                playbackProgress: result.progress_ms,
                songLength: result.item.duration_ms

            }

            return res.json(res_send)
        }
    
    }

    request(options, callback);


})



app.get('/setCookie', async function (req,res)
{
    // read cookies

    var options = {
        maxAge: 1000 * 60 * 15, // would expire after 15 minutes
        httpOnly: false, // The cookie only accessible by the web server 
    }


    res.cookie('cookieName', 'cookieValue', options) // options is optional
    res.send('')
})

app.post('/playURI', async (req,res) => {

    console.log(req.body)

    var uri = req.body.next_uri
    var device_id = req.body.device_id
    var playback_progress = req.body.playback_progress
    var access_token = req.cookies.accessToken

    var headers = {
        'Accept': 'application/json',
        'Authorization': 'Bearer ' + access_token,
        'Content-Type': 'application/json'
    };

    var dataString = '{"uris":["' + uri + '"], "position_ms": "' + playback_progress + '"}';

    console.log(dataString)

    var options = {
        url: 'https://api.spotify.com/v1/me/player/play?device_id=' + device_id,
        method: 'PUT',
        headers: headers,
        body: dataString
    };


    request(options);

    return res.send()
})


io.on('connection', (socket) => {
   
    socket.on('new_message', (data) => {
        console.log('data => ' + data)
        console.log(socket.username + ' sent a message: ' + data.message + '')
        io.sockets.emit('new_message', {message: data.message, username: socket.username})
    })

    socket.on('join_room', (data) => {
        console.log(data.room_id)
    })

    socket.on('user_logon', (data) => {
        console.log('data.username => ' + data.username)
        socket.username = data.username
        console.log('socket.username => ' + socket.username)
        socket.emit('user_logon', { username: socket.username})
    })

    socket.on('check_username', (data)=> {
        console.log(socket.username)
    })


    socket.on('new_song', (data) => {
        //(song_name, song_album, album_url, uri, username) =>

        console.log(data)

        if (data.usertype =='host'){
            var song_name = data.song_name
            var album_name = data.album_name
            var album_url = data.album_url
            var artist_name = data.artist_name
            var uri = data.uri
            var playback_pos = data.playback_pos

            socket.broadcast.emit('slave_song', {
                song_name: song_name,
                album_name: album_name,
                album_url: album_url,
                artist_name: artist_name,
                uri: uri,
                playback_pos: playback_pos

            })   
        }
    })

})


server.listen(serverPort, function () {
    console.log('server up and running at %s port', serverPort);
});