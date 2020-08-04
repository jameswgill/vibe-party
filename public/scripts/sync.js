$(function () {

    var socket = io.connect('https://192.168.1.139:9999/')
    
    var syncButton = $("#syncButton")

    syncButton.on('click', function() {

        var userInt = $("#UserType").val()
        
        if (userInt == '1') {
            var userType = 'host'
        } else {
            var userType = 'slave'
        }

        socket.emit('new_song', {
            song_name: $('#songName').html(),
            album_name: $("#albumName").html(),
            album_url: $("#AlbumArt").css('background-image').split('"')[1],
            uri: $("#uri").html(),
            artist_name: $("#artistName").html(),
            usertype: userType,
            playback_pos: $("#playback_progress").html(),

        })
    })
    




    socket.on('slave_song' , (data) => {
        console.log(data)

        var device_id = $("#DeviceForm").val()

        PlayURI(data.uri, data.playback_pos, device_id)
        getPlayingInfo()
        
    })
})