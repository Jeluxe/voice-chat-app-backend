const Friend = require('../models/friend.model');
const { findUserByUsername } = require('./user');

const porcessFriendObject = async (friend, isSender) => {
  let populatedFriend = await Friend.populate(friend, {
    path: isSender ? 'receiver' : 'sender',
  });

  populatedFriend = populatedFriend.toJSON()

  const processedFriend = {
    ...populatedFriend,
    user: isSender ? populatedFriend.receiver : populatedFriend.sender,
  };

  delete processedFriend.receiver;
  delete processedFriend.sender;

  return processedFriend;
}

const fetchFriendRequests = async (id) => {
  try {
    const friends = await Friend.find({ $or: [{ receiver: id }, { sender: id }] });

    if (friends.length > 0) {
      const processedFriends = await Promise.all(friends.map(async friend => {

        const isSender = friend.sender === id

        return await porcessFriendObject(friend, isSender);
      }));

      return processedFriends
    } else {
      console.log('No friends found.');
    }
  } catch (error) {
    console.error('find friends requests failed: ', error)
  }
}

const createFriendRequest = async (user, targetUsername) => {
  try {
    const receiver = await findUserByUsername(targetUsername);

    if (!receiver) throw "no such username, please consider case sensitive."

    const validateSameUser = user.id === receiver.id;

    if (validateSameUser) throw "cannot be send to yourself"

    const friendRequestExists = await Friend.findOne({ $or: [{ sender: user.id, receiver: receiver.id }, { sender: receiver.id, receiver: user.id }] });

    if (!friendRequestExists) {
      const newFriendRequest = new Friend({ sender: user.id, receiver: receiver.id });
      const friend = await newFriendRequest.save()

      return await porcessFriendObject(friend, true)
    }
    throw 'friend request already exists'
  } catch (error) {
    console.error('friend-creation request failed: ', error)
    return { type: 'error', message: error }
  }
}

module.exports = {
  fetchFriendRequests,
  createFriendRequest
}