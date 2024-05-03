'use client'

//translation.js
import { DefaultEventsMap } from "@socket.io/component-emitter";
import { Socket } from "socket.io-client";

export let mediaRecorder: MediaRecorder | undefined;
let mediaRecorderTimeSlice = 1000;
let firstOpen = true;
let lastRecordingTimeDelta = 1;
let recording = false
let myPermanentId = ''
let connected = false
export let changeStateMR = () => {
    console.log('changing state')
    if (mediaRecorder === undefined) {
        console.log('ERROR OCCURRED WITH MediaRecorder (No such instance)');
        return;
    }
    if (mediaRecorder.state !== 'recording') {
        mediaRecorder.start(mediaRecorderTimeSlice)
    } else {
        mediaRecorder.stop();
    }
};


export const setMediaRecorderUndefined = () => {
    mediaRecorder = undefined
}

export let initMediaRecorder = (stream: MediaStream, socket: Socket<DefaultEventsMap, DefaultEventsMap>, myRoomID: string | string[], permanentId: string, audioMuted: boolean) => {
    console.log('Started recorder');
    socket.emit('connect_recognizer', {
        room_id: myRoomID,
        firstCheckpoint: 1,
        last_recording: lastRecordingTimeDelta,
        type: 'end',
        permanent_id: permanentId
    })

    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
            console.log('new_data');
            socket.emit('new_recording', {audio: event.data, permanent_id: permanentId});
        }
    };
    mediaRecorder.onstart = async () => {
        if (firstOpen) {
            firstOpen = false;
            return;
        }
    recording = true

    }
    mediaRecorder.onstop = async () => {
        console.log('Ended recorder')
        socket.emit('disconnect_recognizer', {
            permanent_id: permanentId
        })
        recording = false
    };
    mediaRecorder.start(mediaRecorderTimeSlice);
    if (audioMuted) {
        changeStateMR();
    }
};