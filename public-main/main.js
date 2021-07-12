let Peer = require('simple-peer')
let socket = io()
const video = document.querySelector('video')
const filter = document.querySelector('#filter')
const checkboxTheme = document.querySelector('#theme')
let client = {}
let currentFilter
//get stream
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
        socket.emit('NewClient')
        video.srcObject = stream
        video.play()

        filter.addEventListener('change', (event) => {
            currentFilter = event.target.value
            video.style.filter = currentFilter
            SendFilter(currentFilter)
            event.preventDefault
        })

        //used to initialize a peer
        function InitPeer(type) {
            let peer = new Peer({ initiator: (type == 'init') ? true : false, stream: stream, trickle: false })
            peer.on('stream', function (stream) {
                CreateVideo(stream)
            })
            //This isn't working in chrome; works perfectly in firefox.
            // peer.on('close', function () {
            //     document.getElementById("peerVideo").remove();
            //     peer.destroy()
            // })
            peer.on('data', function (data) {
                let decodedData = new TextDecoder('utf-8').decode(data)
                let peervideo = document.querySelector('#peerVideo')
                peervideo.style.filter = decodedData
            })
            return peer
        }

        //for peer of type init
        function MakePeer() {
            client.gotAnswer = false
            let peer = InitPeer('init')
            peer.on('signal', function (data) {
                if (!client.gotAnswer) {
                    socket.emit('Offer', data)
                }
            })
            client.peer = peer
        }

        //for peer of type not init
        function FrontAnswer(offer) {
            let peer = InitPeer('notInit')
            peer.on('signal', (data) => {
                socket.emit('Answer', data)
            })
            peer.signal(offer)
            client.peer = peer
        }

        function SignalAnswer(answer) {
            client.gotAnswer = true
            let peer = client.peer
            peer.signal(answer)
        }

        function CreateVideo(stream) {
            CreateDiv()

            let video = document.createElement('video')
            video.id = 'peerVideo'
            video.srcObject = stream
            video.setAttribute('class', 'embed-responsive-item')
            document.querySelector('#peerDiv').appendChild(video)
            video.play()
            //wait for 1 sec
            setTimeout(() => SendFilter(currentFilter), 1000)

            video.addEventListener('click', () => {
                if (video.volume != 0)
                    video.volume = 0
                else
                    video.volume = 1
            })
            const tracks = video.getTracks();
            video.addEventListener('dblclick', () => {
                tracks[0].stop();
            })

        }

        function SessionActive() {
            document.write('Session Active. Please come back later')
        }

        function SendFilter(filter) {
            if (client.peer) {
                client.peer.send(filter)
            }
        }

        function RemovePeer() {
            document.getElementById("peerVideo").remove();
            document.getElementById("muteText").remove();
            if (client.peer) {
                client.peer.destroy()
            }
        }

        socket.on('BackOffer', FrontAnswer)
        socket.on('BackAnswer', SignalAnswer)
        socket.on('SessionActive', SessionActive)
        socket.on('CreatePeer', MakePeer)
        socket.on('Disconnect', RemovePeer)

    })
    .catch(err => document.write(err))

checkboxTheme.addEventListener('click', () => {
    if (checkboxTheme.checked == true) {
        document.body.style.backgroundColor = '#212529'
        if (document.querySelector('#muteText')) {
            document.querySelector('#muteText').style.color = "#fff"
        }

    }
    else {
        document.body.style.backgroundColor = '#fff'
        if (document.querySelector('#muteText')) {
            document.querySelector('#muteText').style.color = "#212529"
        }
    }
}
)

function CreateDiv() {
    let div = document.createElement('div')
    div.setAttribute('class', "centered")
    div.id = "muteText"
    div.innerHTML = "Click to Mute/Unmute"
    document.querySelector('#peerDiv').appendChild(div)
    if (checkboxTheme.checked == true)
        document.querySelector('#muteText').style.color = "#fff"
}


let name;
let textarea = document.querySelector('#textarea')
let messageArea = document.querySelector('.message__area')
do {
    name = prompt('Please enter your name: ')
} while(!name)

textarea.addEventListener('keyup', (e) => {
    if(e.key === 'Enter') {
        sendMessage(e.target.value)
    }
})

function sendMessage(message) {
    let msg = {
        user: name,
        message: message.trim()
    }
    // Append 
    appendMessage(msg, 'outgoing')
    textarea.value = ''
    scrollToBottom()

    // Send to server 
    socket.emit('message', msg)

}

function appendMessage(msg, type) {
    let mainDiv = document.createElement('div')
    let className = type
    mainDiv.classList.add(className, 'message')

    let markup = `
        <h4>${msg.user}</h4>
        <p>${msg.message}</p>
    `
    mainDiv.innerHTML = markup
    messageArea.appendChild(mainDiv)
}

// Recieve messages 
socket.on('message', (msg) => {
    appendMessage(msg, 'incoming')
    scrollToBottom()
})

function scrollToBottom() {
    messageArea.scrollTop = messageArea.scrollHeight
}

