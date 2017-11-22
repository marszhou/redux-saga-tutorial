import { delay, buffers, eventChannel, END, channel } from 'redux-saga';
import {
  put,
  takeEvery,
  all,
  take,
  fork,
  cancel,
  cancelled,
  call,
  actionChannel
} from 'redux-saga/effects';

// first
export function* helloSaga() {
  console.log('Hello Sagas!');
}

// async effect
export function* incrementAsync(payload) {
  console.log(payload);
  yield delay(1000);
  yield put({ type: 'INCREMENT' });
}

// Our watcher Saga: spawn a new incrementAsync task on each INCREMENT_ASYNC
export function* watchIncrementAsync() {
  yield takeEvery('INCREMENT_ASYNC', incrementAsync);
}

// block!
function* accoutSaga() {
  console.log('begin');

  yield take('LOGIN');

  console.log('when login');

  yield take('LOGOUT');

  console.log('logout, finieshed');
}

const Api = {
  authorize: (user, password) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        console.log('token success');

        resolve('token12345');
      }, 3000);
    });
  },
  storeItem: item => {
    return new Promise(resolve => {
      setTimeout(() => {
        console.log('saveItem', item);
        resolve(true);
      }, 2000);
    });
  },
  clearItem: key => {
    return new Promise(resolve => {
      setTimeout(() => {
        console.log('clearItem', key);
        resolve(true);
      }, 1000);
    });
  }
};

// uncancelable effect
// function* authorize(user, password) {
//   try {
//     const token = yield call(Api.authorize, user, password);
//     yield put({ type: 'LOGIN_SUCCESS', token });
//     return token;
//   } catch (error) {
//     yield put({ type: 'LOGIN_ERROR', error });
//   }
// }

// function* loginSaga() {
//   while (true) {
//     const { user, password } = yield take('LOGIN_REQUEST');
//     const token = yield call(authorize, user, password);
//     console.log('token', token);
//     if (token) {
//       yield call(Api.storeItem, { token });
//       yield take('LOGOUT');
//       yield call(Api.clearItem, 'token');
//     }
//   }
// }

// cancelable effect
function* authorize(user, password) {
  try {
    console.log('begin request');
    const token = yield call(Api.authorize, user, password);
    console.log('retrieve token:', token);

    yield put({ type: 'LOGIN_SUCCESS', token });
    yield call(Api.storeItem, { token });
  } catch (error) {
    yield put({ type: 'LOGIN_ERROR', error });
  } finally {
    if (yield cancelled()) {
      console.log('been cancelled :<');
    }
  }
}

function* loginSaga() {
  while (true) {
    const { user, password } = yield take('LOGIN_REQUEST');
    const task = yield fork(authorize, user, password);
    const action = yield take(['LOGOUT', 'LOGIN_ERROR']);
    if (action.type === 'LOGOUT') yield cancel(task);
    yield call(Api.clearItem, 'token');
  }
}

// yield*
function* playLevelOne() {
  yield delay(1000);
  return 1;
}

function* playLevelTwo() {
  yield delay(1000);
  return 2;
}

function* playLevelThree() {
  yield delay(1000);
  return 3;
}

function showScore(score) {
  return {
    type: 'SCORING',
    score
  };
}

function* game() {
  yield take('GAME_BEGIN');
  // const score1 = yield* playLevelOne();
  const score1 = yield call(playLevelOne);
  console.log(score1);
  yield put(showScore(score1));

  const score2 = yield* playLevelTwo();
  console.log(score2);
  yield put(showScore(score2));

  const score3 = yield* playLevelThree();
  console.log(score3);
  yield put(showScore(score3));
}

// queued request by actionChannel
let counter = 0;
function handleQueueRequest(payload) {
  return new Promise(resolve =>
    setTimeout(() => {
      console.log(`queue ${counter} resolved`);
      resolve(counter);
      ++counter;
    }, 1500)
  );
}

function* watchQueueRequests() {
  // 1- Create a channel for request actions
  console.log('queue begin');

  const requestChan = yield actionChannel('QUEUE_REQUEST', buffers.sliding(5)); // channel queue size = 5
  while (true) {
    // 2- take from the channel
    const { taskCounter: payload } = yield take(requestChan);
    console.log(`receive payload`, payload);

    // 3- Note that we're using a blocking call
    const result = yield call(handleQueueRequest, payload);
    console.log(`queue ${result} finished`);
  }
}

// eventChannel

function countdown(secs) {
  return eventChannel(emitter => {
    const iv = setInterval(() => {
      secs -= 1;
      if (secs > 0) {
        emitter(secs);
      } else {
        // this causes the channel to close
        emitter(END);
      }
    }, 1000);
    // The subscriber must return an unsubscribe function
    return () => {
      console.log('unsubscribe!');
      clearInterval(iv);
    };
  });
}

export function* countdownSaga(value) {
  // console.log('countdown saga begin');
  // console.log('countdown payload:', payload);
  const chan = yield call(countdown, value);
  console.log(chan);
  try {
    while (true) {
      // take(END) will cause the saga to terminate by jumping to the finally block
      let seconds = yield take(chan);
      console.log(`countdown: ${seconds}`);
      if (seconds < 8) {
        // chan.close();
      }
    }
  } finally {
    if (yield cancelled()) {
      chan.close();
      console.log('countdown cancelled');
    } else console.log('countdown terminated');
  }
}

function* watchCountdown() {
  const { payload } = yield take('countdown');
  const task = yield fork(countdownSaga, payload.value);
  console.log('watch countdown cancel');
  yield take('countdown_cancel');
  console.log('try cancel countdown');
  yield cancel(task);
}

function* watchChanneledRequests() {
  // create a channel to queue incoming requests
  const chan = yield call(channel)

  // create 3 worker 'threads'
  for (var i = 0; i < 3; i++) {
    yield fork(handleChanneledRequest, chan, i)
  }

  while (true) {
    // console.log('channel workers wait for request');
    const {payload} = yield take('REQUEST_CHANNELED')
    // console.log('channel received job', payload);
    yield put(chan, payload)
  }
}

function* handleChanneledRequest(chan, index) {
  while (true) {
    const payload = yield take(chan);
    console.log('**channel ' + index + ' is working!');
    yield delay(3000);
    console.log('>>channel ' + index + ' is free!');
  }
}

export default function* rootSaga() {
  yield all([
    helloSaga(),
    watchIncrementAsync(),
    accoutSaga(),
    loginSaga(),
    game(),
    watchQueueRequests(),
    watchCountdown(),
    watchChanneledRequests()
  ]);
}
