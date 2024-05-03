'use client'

//page.tsx

import React, {useEffect, useRef, useState} from 'react';
import {
  Button,
  Card,
  CardBody,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Tooltip,
  useDisclosure
} from '@nextui-org/react';
import translationStyles from './TranslationCard.module.css'
import { motion, AnimatePresence } from 'framer-motion';
import {useParams, useRouter, useSearchParams} from 'next/navigation';
import io from 'socket.io-client';
import VideocamIcon from '@mui/icons-material/Videocam';
import MicIcon from '@mui/icons-material/Mic';
import CallEndRoundedIcon from '@mui/icons-material/CallEndRounded';
import AddLinkIcon from '@mui/icons-material/AddLink';
import SpeakerNotesIcon from '@mui/icons-material/SpeakerNotes';
import SpeakerNotesOffIcon from '@mui/icons-material/SpeakerNotesOff';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import FileOpenRoundedIcon from '@mui/icons-material/FileOpenRounded';
import {changeStateMR, initMediaRecorder, mediaRecorder, setMediaRecorderUndefined} from '@/app/utils/translation';
import {
  appendMessage,
  decode,
  dragAndDrop,
  fetchAndDownloadChatHistory,
  generateAndSavePermanentId,
  playAudio,
  speaking,
  ttsQueue,
  showTranslation,
  createChatBG
} from '@/app/utils/utils';
import {
  myID,
  onConnect,
  onData,
  onUserConnect,
  onUserDisconnected,
  onUserList,
  updateAudioTracks,
  updateVideoTracks,
} from '@/app/utils/socketNetworkHandlers';
import MicOffIcon from '@mui/icons-material/MicOff';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';

// const socket = io('https://nameless-inlet-92930-bb88adb4f773.herokuapp.com', { autoConnect: false });
const socket = io('https://call-translator-27d21e073e70.herokuapp.com', { autoConnect: false });

const constraints: MediaStreamConstraints = {
  audio: {
    sampleRate: 48000,
    sampleSize: 16,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  },
  video: true
};

const VideoChat = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const displayName = decode(searchParams.get('displayName'));
  const muteAudio = searchParams.get('audioMuted') === 'true';
  const muteVideo = searchParams.get('videoMuted') === 'true';
  // const muteAudio = true
  // const muteVideo = true
  const language = searchParams.get('language');
  const videoRef = useRef<HTMLVideoElement>(null);
  let { roomId, roomName } = useParams();
  if (Array.isArray(roomId)) {
    roomId = roomId[0];
  }
  roomName = decode(roomName);
  const [showTranslationChat, setShowTranslationChat] = useState<boolean>(false);
  const [currentTranslationCard, setCurrentTranslationCard] = useState<JSX.Element | null>(null);
  const translationCardTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [audioMuted, setAudioMuted] = useState<boolean>(muteAudio);
  const [videoMuted, setVideoMuted] = useState<boolean>(muteVideo);
  const [showChat, setShowChat] = useState<boolean>(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLDivElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [stream, setStream] = useState<any>(null);
  const DEBUG_TEST_MESSAGES = false;
  const {isOpen, onOpen, onOpenChange} = useDisclosure();
  // const [isMounted, setIsMounted] = useState<boolean>(true)
  const isMounted = useRef(true);
  const permanentId = generateAndSavePermanentId();

const toggleAudio = () => {
  setAudioMuted(!audioMuted);
  setAudioMuteState();
};

const toggleVideo = () => {
  setVideoMuted(!videoMuted);
  setVideoMuteState();
};

const setAudioMuteState = async () => {
  if (!videoRef.current || !(videoRef.current.srcObject instanceof MediaStream)) {
    return;
  }

  const audioTracks = videoRef.current.srcObject.getAudioTracks();

  if (!audioMuted) {
    audioTracks.forEach((track) => {
      track.enabled = false;
    });
    if (mediaRecorder) {
      mediaRecorder.stop();
    }
    setMediaRecorderUndefined();
  } else {
    const stream = await startLocalAudio() as MediaStream;
    updateAudioTracks(stream);
    initMediaRecorder(videoRef.current.srcObject as MediaStream, socket, roomId, permanentId, !audioMuted);
  }
};

const setVideoMuteState = async () => {
  if (!videoRef.current || !(videoRef.current.srcObject instanceof MediaStream)) {
    return;
  }

  const videoTracks = videoRef.current.srcObject.getVideoTracks();

  if (!videoMuted) {
    videoTracks.forEach((track) => {
      track.enabled = false;
      // setTimeout(() => {
      //   track.stop()
      // }, 500)
    });
  } else {
    videoTracks.forEach((track) => {
      track.enabled = true;
      // setTimeout(() => {
      //   track.stop()
      // }, 500)
    });
    // const stream = await startLocalVideo() as MediaStream;
    // updateVideoTracks(stream);
  }
};

const startLocalAudio = async () => {
  try {
    const audioStream = await navigator.mediaDevices.getUserMedia({ audio: constraints.audio, video: false });
    if (videoRef.current) {
      const stream = videoRef.current.srcObject as MediaStream;
      const audioTracks = stream.getAudioTracks();

      if (audioTracks.length > 0) {
        const newAudioTrack = audioStream.getAudioTracks()[0];
        const oldAudioTrack = audioTracks[0];

        stream.removeTrack(oldAudioTrack);
        stream.addTrack(newAudioTrack);

        oldAudioTrack.stop();
      }
    }
    return audioStream;
  } catch (error) {
    console.error('Error accessing audio device:', error);
    return null;
  }
};

const startLocalVideo = async () => {
  try {
    const videoStream = await navigator.mediaDevices.getUserMedia({ video: constraints.video, audio: false });
    if (videoRef.current) {
      const stream = videoRef.current.srcObject as MediaStream;
      const videoTracks = stream.getVideoTracks();

      if (videoTracks.length > 0) {
        const newVideoTrack = videoStream.getVideoTracks()[0];
        const oldVideoTrack = videoTracks[0];

        stream.removeTrack(oldVideoTrack);
        stream.addTrack(newVideoTrack);

        setTimeout(oldVideoTrack.stop, 500)
      }
    }
    return videoStream;
  } catch (error) {
    console.error('Error accessing video device:', error);
    return null;
  }
};


const [linkCopied, setLinkCopied] = useState(false);


const copyLink = () => {
  const { protocol, host, pathname } = window.location;
  const roomID = pathname.split('/')[2];
  const displayedRoomName = pathname.split('/')[3];
  const checkpointLink = `${protocol}//${host}/call/${roomID}/${displayedRoomName}/checkpoint/`;
  navigator.clipboard.writeText(checkpointLink)
    .then(() => setLinkCopied(true))
    .catch((err) => console.error('Failed to copy link:', err));
  setTimeout(() => {
    setLinkCopied(false);
  }, 2000);
};

const toggleChat = () => {
    const makeVideoSmall = () => {
      if (videoContainerRef.current) {
        videoContainerRef.current.classList.remove('fixed_video_container');
        videoContainerRef.current.classList.add('fixed_video_container_small');
      }
    };

    const makeVideoBig = () => {
      if (videoContainerRef.current) {
        videoContainerRef.current.classList.remove('fixed_video_container_small');
        videoContainerRef.current.classList.add('fixed_video_container');
      }
    };

    setShowChat(!showChat);

    if (!showChat) {
      makeVideoSmall();
    } else {
      makeVideoBig();
    }
  };


  const endCall = () => {
    setVideoMuted(true);
    setAudioMuted(true);
    onOpen();
  };

  const downloadChatHistory = () => {
    if (Array.isArray(roomId)) {
      roomId = roomId[0]
    }
    fetchAndDownloadChatHistory(roomId, myID)
  };


  const startLocalStream = async () => {
    try {
      const stream: MediaStream = await navigator.mediaDevices.getUserMedia(constraints)

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      return null;
    }
  };

  const initialMute = () => {
    if (!videoRef.current || !(videoRef.current.srcObject instanceof MediaStream)) {
      return
    }
    if (videoMuted) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach( track => {
          if (track.kind === 'video') {
              track.enabled = false
          }
      })
    }
    if (audioMuted) {
      const audioTracks = videoRef.current.srcObject.getAudioTracks();
      audioTracks.forEach((track: any) => {
        track.enabled = false;
      });
    }
  }
  setTimeout( () => {
    if (!videoRef.current) {
      return
    }
    const stream = videoRef.current.srcObject as MediaStream
    if (!stream) {
      return;
    }
    const tracks = stream.getTracks();
    tracks.forEach( track => {
      if (track.kind === 'video') {
        track.enabled = false
        // track.stop()
      }
    })
  }, 1000)
  useEffect(() => {
    if (isMounted.current) {
      document.addEventListener('click', () => {
        console.log(1000)
        console.log(showTranslationChat)
        setShowTranslationChat(false)
      });
      isMounted.current = false
      startLocalStream().then( (stream) => {
        if (stream) {
          const videoTracks = stream.getVideoTracks();
          const audioTracks = stream.getAudioTracks()
          if (videoMuted) {
            console.log(videoTracks)
            videoTracks.forEach((track) => {
              track.enabled = false;
              setTimeout(() => {
                // track.stop()
              }, 1000)
            });
          }
          if (audioMuted) {
            audioTracks.forEach((track) => {
              track.enabled = false;
            });
          } else {
          }
        }
      })
      dragAndDrop(localVideoRef);
      dragAndDrop(messagesRef);
      setTimeout( () => {
        socket.connect()
        socket.on('connect', () => {
          console.log('CONNECTED')
          console.log('connected media recorder')
            setTimeout( () => {
              if (!audioMuted && videoRef.current) {
                initMediaRecorder(videoRef.current.srcObject as MediaStream, socket, roomId, permanentId, false)
              }
            }, 1000)
        })
      }, 1000)
      socket.on('connect', () => {
        onConnect(socket, roomId, roomName, displayName, language);
      });

      socket.on('user-connect', (data: any) => {
        onUserConnect(data);
      });

      socket.on('user-disconnect', (data: any) => {
        onUserDisconnected(data);
      });

      socket.on('user-list', (data: any) => {
        onUserList(data, socket, videoRef.current);
      });

      socket.on('data', (msg: any) => {
        onData(msg, socket, videoRef.current);
      });

      socket.on('new_message', async (data: any) => {
        // appendMessage(data.local, data.id, data.text, data.original, data.type, data.name)
        // if (!data.original){
        //   const audioBytes = data.audio
        //   if (speaking) {
        //       ttsQueue.enqueue(audioBytes)
        //   }
        //   else {
        //       await playAudio(audioBytes)
        //   }
        // }
        if (data.original) {
          return
        }
          const audioBytes = data.audio
        const translationCard = showTranslation(data.name, data.text);
        setCurrentTranslationCard(translationCard);
        setShowTranslationChat(true)
        if (translationCardTimerRef.current) {
          clearTimeout(translationCardTimerRef.current);
        }
        console.log(data)
        translationCardTimerRef.current = setTimeout(() => {
          setCurrentTranslationCard(null);
        }, 100000);
      });
    }

  }, []);

  return (
    <div className="w-full h-full flex m-4 flex-col relative">
  {/* Main Content */}

  <div className="fixed inset-0 z-10 flex items-center justify-center">
    {/* Video Grid */}
    <div
      ref={videoContainerRef}
      id="video_container"
      className=" fixed_video_container w-full h-full p-4"
      style={{ maxWidth: "100%", maxHeight: "100%" }}
    >
      <div
        id="video_grid_container"
        className="w-full h-full rounded-lg shadow-md overflow-hidden p-1"
      >
        <div
          id="video_grid"
          className="video-grid h-full w-full grid gap-4 justify-items-center items-center p-4"
        >
          {/* Remote Video Containers */}
        </div>
      </div>
    </div>
  </div>

  {/* Chat */}
  <div className="w-[30vw] h-[85vh] fixed right-0 top-[7.5vh] z-20 p-4 sm:w-1/5" style={{ display: showChat ? 'block' : 'none' }}>
    <Card className="h-full rounded-lg shadow-md">
      <CardBody className="p-0">
        <div className="chat h-full flex flex-col">
          <div
            className="messages flex-1 p-4 overflow-y-auto"
            style={{ maxHeight: '82vh' }}
            id="messages"
          >
            {/* Chat messages */}
          </div>
          <div className="input-container p-4">
            {/* Chat input */}
          </div>
        </div>
      </CardBody>
    </Card>
  </div>

      {/* Side Bar */}
        <Card className="sideCard rounded-lg shadow-md items-center justify-items-center sm:w-1/5 z-50">
        <Tooltip color="primary" content="White Board Mode" delay={250}>
          <Button
            size="sm"
            isIconOnly
            onClick={copyLink}
            className="my-1.5 light: bg-white text-black rounded-lg shadow-md  dark:bg-gray-800 text-white hover:bg-gray-100 transition-colors duration-300"
          >
            <AccountTreeRoundedIcon />
          </Button>
          </Tooltip>

          <Tooltip color="primary" content="Open Documents" delay={250}>
          <Button
            size="sm"
            isIconOnly
            onClick={copyLink}
            className="my-1.5 light: bg-white text-black rounded-lg shadow-md  dark:bg-gray-800 text-white hover:bg-gray-100 transition-colors duration-300"
          >
            <FileOpenRoundedIcon />
          </Button>
          </Tooltip>
          <Button onClick={() => {
            socket.emit('test-message')
          }}>TEST</Button>
        </Card> 
      {/* Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="flex justify-between items-center w-full">
        <div className="w-full sm:w-1/3 flex justify-left items-left space-x-4">
          <div className="flex justify-between items-center p-4">
            <div className="flex items-center space-x-2">
              <h1 className='text-2xl font-semibold'>{roomName}</h1>
              <Tooltip color="primary" content="Copy Room-Link" delay={250} >
                <Button
                  size="sm"
                  isIconOnly
                  onClick={copyLink}
                  className="light: bg-white text-black rounded-lg shadow-md  dark:bg-gray-800 text-white hover:bg-gray-100 transition-colors duration-300 mt-1 sm:mt-2"
                >
                  <AddLinkIcon />
                </Button>
              </Tooltip>
            </div>
          </div>
        </div>
        <div className="w-full sm:w-1/3 flex justify-center items-center space-x-4 sm:space-x-4">
          <Button
            onClick={toggleAudio}
            className="bg-white text-black rounded-full shadow-md  dark:bg-gray-800 text-white hover:bg-gray-100 transition-colors duration-300"
          >
            {audioMuted ? <MicOffIcon /> : <MicIcon />}
          </Button>
          <Button
            onClick={toggleVideo}
            className="bg-white text-black rounded-full shadow-md  dark:bg-gray-800 text-white hover:bg-gray-100 transition-colors duration-300"
          >
            {videoMuted ? <VideocamOffIcon /> : <VideocamIcon />}
          </Button>
          <Button
            className="bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition-colors duration-300"
            onClick={endCall}
          >
            <CallEndRoundedIcon />
          </Button>
        </div>
        <div className="w-full sm:w-1/3 flex justify-end items-center space-x-4">
        <Tooltip color="primary" content="Messages" delay={250}>
            <Button
              size="md"
              isIconOnly
              onClick={toggleChat}
              className="mr-4 bg-white text-black rounded-full shadow-md dark:bg-gray-800 text-white hover:bg-gray-100 transition-colors duration-300"
            >
              {showChat ? <SpeakerNotesIcon fontSize="small" /> : <SpeakerNotesOffIcon fontSize="small" />}
            </Button>
          </Tooltip>
          <div
            ref={localVideoRef}
            id="local_vid_container"
            className="local-video-container rounded-lg shadow-md overflow-hidden"
          >
            <video
              ref={videoRef}
              id="local_vid"
              autoPlay
              muted
              className="local-video w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </div>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">End Call</ModalHeader>
              <ModalBody>
                <p>Would you like to download the Voice Transcription before ending the call?</p>
              </ModalBody>
              <ModalFooter>
                <div className='w-full h-full flex justify-between items-center p-0'>
                <div className='w-2/5 justify-start items-start'>
                <Button color="danger" variant="light" onPress={onClose}>
                  Cancel
                </Button>
                </div>
                <div className='w-3/5 justify-end items-end'>
                <Button
                  color="danger"
                  onPress={() => {
                    onClose();
                    router.push("/start");
                  }}
                >
                  Just End the Call
                </Button>
                <Button color="success" variant="solid" onPress={onClose} className='mx-1' onClick={downloadChatHistory}>
                  Yes
                </Button>
                </div>
                </div>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
      {linkCopied && (
        <a></a>
      )}

      <AnimatePresence>
        {showTranslationChat && (
          <motion.div
            initial={{ opacity: .5, borderRadius: 100, height: 0 }}
            animate={{ opacity: 1, borderRadius: 15, height: '40vh', width: '45vw'}}
            transition={{ duration: .3 }}
            exit={{ opacity: 0, y: 100 }}
            className={`bg-content1 z-40 w-full absolute bottom-10 mb-20 left-1/4 transform -translate-x-3/4 -translate-y-1/2 pointer-events-auto ${translationStyles.backgroundDiv}`}
            style={{padding: '0', width: '45vw', height: '40vh'}}>
            <div className={`${translationStyles.chatContainer} -mb-5 mt-5`} style={{width: '100%', height: '90%', overflowY: 'auto', borderRadius: '15px'}}>
              <motion.div
                initial={{ opacity: 0, y: -125 }}
                animate={{ opacity: 1, y: -25 }}
                exit={{ opacity: 0, y: -50 }}
                transition={{ duration: 0.7 }}
                className="relative inset-0 z-50 pointer-events-none cursor-pointer"
                onClick={createChatBG}
              >
                <div className={`relative pointer-events-auto translate-y bottom-0 mt-7 ${translationStyles.translationCard}`} style={{minWidth: '90%', marginLeft: '5%', marginRight: '5%', backgroundColor: 'transparent'}}>
                  {currentTranslationCard}
                </div>
                <div className={`relative pointer-events-auto translate-y bottom-0 mt-7 ${translationStyles.translationCard}`} style={{minWidth: '90%', marginLeft: '5%', marginRight: '5%', backgroundColor: 'transparent'}}>
                  {currentTranslationCard}
                </div>
                <div className={`relative pointer-events-auto translate-y bottom-0 mt-7 ${translationStyles.translationCard}`} style={{minWidth: '90%', marginLeft: '5%', marginRight: '5%', backgroundColor: 'transparent'}}>
                  {currentTranslationCard}
                </div>
                <div className={`relative pointer-events-auto translate-y bottom-0 mt-7 ${translationStyles.translationCard}`} style={{minWidth: '90%', marginLeft: '5%', marginRight: '5%', backgroundColor: 'transparent'}}>
                  {currentTranslationCard}
                </div>
                <div className={`relative pointer-events-auto translate-y bottom-0 mt-7 ${translationStyles.translationCard}`} style={{minWidth: '90%', marginLeft: '5%', marginRight: '5%', backgroundColor: 'transparent'}}>
                  {currentTranslationCard}
                </div>
                <div className={`relative pointer-events-auto translate-y bottom-0 mt-7 ${translationStyles.translationCard}`} style={{minWidth: '90%', marginLeft: '5%', marginRight: '5%', backgroundColor: 'transparent'}}>
                  {currentTranslationCard}
                </div>
                <div className={`relative pointer-events-auto translate-y bottom-0 mt-7 ${translationStyles.translationCard}`} style={{minWidth: '90%', marginLeft: '5%', marginRight: '5%', backgroundColor: 'transparent'}}>
                  {currentTranslationCard}
                </div>
                <div className={`relative pointer-events-auto translate-y bottom-0 mt-7 ${translationStyles.translationCard}`} style={{minWidth: '90%', marginLeft: '5%', marginRight: '5%', backgroundColor: 'transparent'}}>
                  {currentTranslationCard}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VideoChat;