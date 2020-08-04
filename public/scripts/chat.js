$(function() {
    var socket = io.connect('https://192.168.1.139:9999/')

    var form = $("#chatForm")
    var message = $("#message")

    var send_username = $("#send_username")
    var chatroom = $("#chatroom")


    socket.on('new_message', (data) => {
        console.log(data)
        chatroom.append("<p class='chat' >" + data.username + ": " + data.message + "</p>")
    
        const scrollForm = () => {
            $("#chatroom").scrollTop(9000000000000);
        }
        scrollForm()
    })

    function SubmitChatData (message) {
        socket.emit('new_message', { message: message, username: socket.username })
    }


    form.submit(function(event){
        event.preventDefault();
        if (message === ''){
            alert('Message is Empty')
        } else{
            SubmitChatData($("#message").val())
        }
    })

})