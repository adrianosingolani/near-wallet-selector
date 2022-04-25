import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';

export default function Messages({ messages }) {
  return (
    <>
      <h2>Messages</h2>
      {messages.map((message, i) =>
        // TODO: format as cards, add timestamp
        <p key={i} className={message.premium ? 'message is-premium' : 'message'}>
          <span style={{fontSize: '10px', fontStyle: 'italic'}}>
            {moment(message.datetime/1000000).format('YYYY-MM-DD HH:mm:ss')}
          </span><br />

          <strong>{message.sender}</strong>:<br/>

          {message.text}
        </p>
      )}
    </>
  );
}

Messages.propTypes = {
  messages: PropTypes.array
};