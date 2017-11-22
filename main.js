import 'babel-polyfill';

import React from 'react';
import ReactDOM from 'react-dom';
import { createStore, applyMiddleware } from 'redux';
import createSagaMiddleware from 'redux-saga';

import Counter from './Counter';
import reducer from './reducers';

import rootSaga from './sagas';

const sagaMiddleware = createSagaMiddleware();
const store = createStore(reducer, applyMiddleware(sagaMiddleware));
sagaMiddleware.run(rootSaga);

const action = type => store.dispatch({ type });
let taskCounter = 0;

function render() {
  ReactDOM.render(
    <div>
      <Counter
        value={store.getState()}
        onIncrement={() => action('INCREMENT')}
        onDecrement={() => action('DECREMENT')}
        onIncrementAsync={() =>
          store.dispatch({ type: 'INCREMENT_ASYNC', name: 'incr async' })}
      />
      <button onClick={() => store.dispatch({ type: 'LOGIN' })}>login</button>
      <button onClick={() => store.dispatch({ type: 'LOGOUT' })}>logout</button>

      <hr />
      <button
        onClick={() =>
          store.dispatch({
            type: 'LOGIN_REQUEST',
            user: 'matt',
            password: '123456'
          })}
      >
        LOGIN_REQUEST
      </button>
      <button
        onClick={() =>
          store.dispatch({
            type: 'LOGOUT'
          })}
      >
        LOGOUT
      </button>
      <hr />
      <button onClick={() => store.dispatch({ type: 'GAME_BEGIN' })}>
        GAME BEGIN
      </button>
      <hr/>
      <button onClick={() => {
          store.dispatch({ type: 'QUEUE_REQUEST', taskCounter });
          taskCounter++;
        }
      }>
        QUEUE REQUEST
      </button>
      <hr/>
      <button onClick={() =>
        store.dispatch({ type: 'countdown', payload: {value: 10}})
      }>
        Launch countdow
      </button>
      <button onClick={() =>
        store.dispatch({ type: 'countdown_cancel'})
      }>
        Cancel countdown
      </button>
      <hr/>
      <button onClick={() =>
        store.dispatch({ type: 'REQUEST_CHANNELED', payload: 'job'})
      }>
        Call Channel Worker to work
      </button>

    </div>,
    document.getElementById('root')
  );
}

render();
store.subscribe(render);
