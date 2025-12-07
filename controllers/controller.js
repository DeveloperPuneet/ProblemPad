// * importing modules
const randomstring = require('randomstring'); // 🧩 Generate random strings
const mongoose = require("mongoose"); // 💾 MongoDB library

// * mongodb models
const Accounts = require("../models/accounts");
const Communities = require("../models/community");
const Problems = require("../models/problem");

// * functions
const Load = async (req, res) => { // ⏳ Asynchronous load function
    try {
        return res.render("Load"); // 🚀 Render the Load view
    } catch (error) {
        console.log(error); // 🐞 Log any errors
    }
}

const create_account = async (req, res) => {
    try {
        res.render("create_account")
    } catch (error) {
        console.log(error);
    }
}

const DashboardLoad = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.redirect('/login');
        }

        // Get user details
        const user = await Accounts.findOne({ us_id: userId });
        if (!user) {
            return res.redirect('/login');
        }

        // Get all communities where user is a member
        const allCommunities = await Communities.find({
            members: { $in: [userId] }
        });

        // Separate communities into "Your Communities" and "Communities You Use"
        const yourCommunities = [];
        const communitiesYouUse = [];

        for (const community of allCommunities) {
            // Check if user is the owner (first member or based on some logic)
            // For now, let's assume the first member in array is owner
            const isOwner = community.members.length > 0 && community.members[0] === userId;

            // Get active problems count for this community
            const activeProblemsCount = await Problems.countDocuments({
                com_id: community.gp_id,
                solved: false
            });

            const communityData = {
                _id: community._id,
                Name: community.Name,
                Description: community.Description || `${community.Name} Community`,
                Category: community.Category,
                members: community.members,
                gp_id: community.gp_id,
                memberCount: community.members.length,
                activeIssueCount: activeProblemsCount,
                userRole: isOwner ? 'Owner' : 'Member'
            };

            if (isOwner) {
                yourCommunities.push(communityData);
            } else {
                communitiesYouUse.push(communityData);
            }
        }

        res.render("dashboard", {
            user: user,
            yourCommunities: yourCommunities,
            communitiesYouUse: communitiesYouUse
        });

    } catch (error) {
        console.log(error);
        res.status(500).send("Internal Server Error");
    }
}

const getting_account = async (req, res) => {
    try {
        const { name, mobile, pin, role, profession, address } = req.body;

        // Check if mobile number already exists
        const existingUser = await Accounts.findOne({ Mob_no: mobile });
        if (existingUser) {
            return res.render("create_account", {
                msg: "Mobile number already registered",
                formData: req.body
            });
        }

        const usr_id = randomstring.generate(20);
        let acc = new Accounts({
            Name: name,
            Mob_no: mobile,
            PIN: pin,
            role: role,
            Proff: profession,
            Address: address,
            us_id: usr_id
        });

        let data = await acc.save();
        if (data) {
            req.session.user = usr_id;
            res.redirect("/dashboard");
        } else {
            res.render("create_account", {
                msg: "Error creating account",
                formData: req.body
            });
        }
    } catch (error) {
        console.log(error);
        res.render("create_account", {
            msg: "Error creating account",
            formData: req.body
        });
    }
}

const createCommunity = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.redirect('/login');
        }

        const { name, description, category, visibility } = req.body;

        // Generate unique community ID
        const gp_id = randomstring.generate(20);

        // Create new community with user as first member (owner)
        const newCommunity = new Communities({
            Name: name,
            Description: description,
            Category: [category],
            members: [userId], // User becomes first member (owner)
            gp_id: gp_id,
            Rating: 0,
            // Visibility settings
            isPublic: visibility === 'public',
            settings: {
                allowPublicJoin: visibility === 'public',
                onlyWorkersCanSolve: false
            }
        });

        await newCommunity.save();
        res.redirect('/dashboard');

    } catch (error) {
        console.log(error);
        res.redirect('/dashboard?error=Failed to create community');
    }
}

const getCommunityPage = async (req, res) => {
    try {
        const userId = req.session.user;
        const communityId = req.params.id;

        if (!userId) {
            return res.redirect('/login');
        }

        // Get community details
        const community = await Communities.findOne({ gp_id: communityId });
        if (!community) {
            return res.status(404).render('404');
        }

        // Check if user is member of this community
        if (!community.members.includes(userId)) {
            return res.render('community_join', {
                user: await Accounts.findOne({ us_id: userId }),
                community: community,
                message: "You need to join this community to access it"
            });
        }

        // Get user details
        const user = await Accounts.findOne({ us_id: userId });

        // Get all problems for this community
        const problems = await Problems.find({ com_id: communityId }).sort({ _id: -1 });

        // Get member details for display
        const memberDetails = await Accounts.find({
            us_id: { $in: community.members }
        }, 'Name role Proff us_id Address Mob_no');

        // Check if user is owner (first member)
        const isOwner = community.members.length > 0 && community.members[0] === userId;

        const activeIssues = problems.filter(p => !p.solved).length;

        res.render("community", {
            user: user,
            community: community,
            problems: problems,
            memberDetails: memberDetails,
            isOwner: isOwner,
            activeIssues: activeIssues
        });

    } catch (error) {
        console.log('ERROR in getCommunityPage:', error);
        res.status(500).render('error', { message: 'Internal Server Error' });
    }
}

const joinCommunityPublic = async (req, res) => {
    try {
        const userId = req.session.user;
        const communityId = req.params.id;

        if (!userId) {
            return res.redirect('/login');
        }

        const community = await Communities.findOne({ gp_id: communityId });
        if (!community) {
            return res.redirect('/discover?error=Community not found');
        }

        // Check visibility and public join setting
        if (!community.isPublic) {
            return res.redirect('/discover?error=Community is private');
        }

        if (community.settings && community.settings.allowPublicJoin === false) {
            return res.redirect('/discover?This community is invite-only');
        }

        // Add user to community (avoid duplicates)
        if (!community.members.includes(userId)) {
            community.members.push(userId);
            await community.save();
        }

        res.redirect(`/com/${communityId}`);
    } catch (error) {
        console.log(error);
        res.redirect('/discover?error=Failed to join community');
    }
}

const login_user = async (req, res) => {
    try {
        const { mobile, pin } = req.body;

        // Find user by mobile number
        const user = await Accounts.findOne({ Mob_no: mobile });

        if (!user) {
            return res.render("login", {
                msg: "Mobile number not registered",
                formData: req.body
            });
        }

        // Check PIN
        if (user.PIN !== pin) {
            return res.render("login", {
                msg: "Invalid PIN",
                formData: req.body
            });
        }

        // Login successful
        req.session.user = user.us_id;
        res.redirect("/dashboard");

    } catch (error) {
        console.log(error);
        res.render("login", {
            msg: "Login failed. Please try again.",
            formData: req.body
        });
    }
}

const logout_user = async (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                console.log(err);
            }
            res.redirect('/');
        });
    } catch (error) {
        console.log(error);
        res.redirect('/');
    }
}

//* updted
const sendNotificationToWorkers = async (communityId, message, problemId = null) => {
    try {
        const community = await Communities.findOne({ gp_id: communityId });
        if (!community) return;

        // Get all workers in the community
        const workers = await Accounts.find({
            us_id: { $in: community.members },
            role: 'worker'
        });

        const notification = {
            id: randomstring.generate(10),
            type: 'new_problem',
            message: message,
            communityId: communityId,
            problemId: problemId,
            timestamp: new Date(),
            read: false
        };

        // Add notification to each worker
        for (const worker of workers) {
            worker.notification.push(notification);
            await worker.save();
        }
    } catch (error) {
        console.log('Error sending notifications:', error);
    }
};

const acceptInvitation = async (req, res) => {
    try {
        const userId = req.session.user;
        const communityId = req.params.id;

        if (!userId) {
            return res.redirect('/login');
        }

        const community = await Communities.findOne({ gp_id: communityId });
        if (!community) {
            return res.status(404).json({ error: 'Community not found' });
        }

        // Check if user is invited
        if (!community.invitedMembers.includes(userId)) {
            return res.status(403).json({ error: 'No invitation found' });
        }

        // Add user to members and remove from invited
        community.members.push(userId);
        community.invitedMembers = community.invitedMembers.filter(id => id !== userId);
        await community.save();

        // Remove the invitation notification
        const user = await Accounts.findOne({ us_id: userId });
        user.notification = user.notification.filter(notif =>
            !(notif.type === 'invitation' && notif.communityId === communityId)
        );
        await user.save();

        res.redirect(`/com/${communityId}`);

    } catch (error) {
        console.log(error);
        res.redirect('/dashboard?error=Failed to accept invitation');
    }
};
// updt
const sendNotification = async (userIds, type, message, communityId = null, problemId = null) => {
    try {
        const notification = {
            id: randomstring.generate(10),
            type: type,
            message: message,
            communityId: communityId,
            problemId: problemId,
            timestamp: new Date(),
            read: false
        };

        // Add notification to each user
        await Accounts.updateMany(
            { us_id: { $in: userIds } },
            { $push: { notification: notification } }
        );

        console.log(`Notification sent to ${userIds.length} users: ${message}`);
    } catch (error) {
        console.log('Error sending notifications:', error);
    }
};

// In your controller, update the raiseProblem function to handle different formats
// In your controller, update the raiseProblem function to handle different formats
const raiseProblem = async (req, res) => {
    try {
        const userId = req.session.user;
        const communityId = req.params.id;
        const { msg, remarks, category, audio_data, audio_mimeType } = req.body;

        if (!userId) {
            return res.redirect('/login');
        }

        // Check if user is member of community
        const community = await Communities.findOne({ gp_id: communityId });
        if (!community || !community.members.includes(userId)) {
            return res.status(403).json({ error: 'Not a member of this community' });
        }

        // Generate unique problem ID
        const pb_id = randomstring.generate(20);

        // Prepare problem data
        const problemData = {
            us_id: userId,
            msg: msg,
            remarks: remarks || '',
            pb_id: pb_id,
            com_id: communityId,
            solved: false,
            confirmed_solved: false,
            category: category || 'general'
        };

        // Handle audio data if present
        if (audio_data && audio_mimeType) {
            try {
                // Convert base64 audio to buffer
                const audioBuffer = Buffer.from(audio_data, 'base64');

                // Validate audio buffer
                if (audioBuffer.length === 0) {
                    throw new Error('Audio buffer is empty');
                }

                // Check MIME type and validate
                const validMimeTypes = [
                    'audio/mpeg', 'audio/mp3', 'audio/mp4',
                    'audio/wav', 'audio/x-wav', 'audio/webm',
                    'audio/ogg', 'audio/aac', 'audio/flac'
                ];

                const mimeType = validMimeTypes.includes(audio_mimeType)
                    ? audio_mimeType
                    : 'audio/mpeg'; // Default to MP3

                problemData.audio_data = audioBuffer;
                problemData.audio_mimeType = mimeType;
                problemData.has_audio = true;

                console.log(`Audio saved: ${audioBuffer.length} bytes, type: ${mimeType}`);
            } catch (audioError) {
                console.error('Error processing audio:', audioError);
                // Don't fail the whole request if audio fails
                problemData.has_audio = false;
            }
        }

        // Create new problem
        const newProblem = new Problems(problemData);
        await newProblem.save();

        // Get user who raised the problem
        const user = await Accounts.findOne({ us_id: userId });

        // Get all workers in the community (excluding the one who raised the problem)
        const workers = await Accounts.find({
            us_id: { $in: community.members },
            role: 'worker',
            us_id: { $ne: userId }
        });

        if (workers.length > 0) {
            const workerIds = workers.map(worker => worker.us_id);
            await sendNotification(
                workerIds,
                'new_problem',
                `New ${category} problem in ${community.Name}${problemData.has_audio ? ' 🔊 (with audio)' : ''}: ${msg.substring(0, 50)}...`,
                communityId,
                pb_id
            );
        }

        res.json({
            success: true,
            message: 'Problem raised successfully',
            problemId: pb_id,
            hasAudio: problemData.has_audio
        });

    } catch (error) {
        console.log('Error raising problem:', error);
        res.status(500).json({ error: 'Failed to raise problem' });
    }
};

// Update inviteMember to send notification
const inviteMember = async (req, res) => {
    try {
        const userId = req.session.user;
        const communityId = req.params.id;
        const { mobileNumber } = req.body;

        if (!userId) {
            return res.redirect('/login');
        }

        // Check if community exists and user is owner
        const community = await Communities.findOne({ gp_id: communityId });
        if (!community) {
            return res.status(404).json({ error: 'Community not found' });
        }

        // Check if user is owner (first member)
        const isOwner = community.members.length > 0 && community.members[0] === userId;
        if (!isOwner) {
            return res.status(403).json({ error: 'Only community owner can invite members' });
        }

        // Find user by mobile number
        const userToInvite = await Accounts.findOne({ Mob_no: mobileNumber });
        if (!userToInvite) {
            return res.status(404).json({ error: 'User not found with this mobile number' });
        }

        // Check if user is already a member
        if (community.members.includes(userToInvite.us_id)) {
            return res.status(400).json({ error: 'User is already a member of this community' });
        }

        // Check if user is already invited
        if (community.invitedMembers && community.invitedMembers.includes(userToInvite.us_id)) {
            return res.status(400).json({ error: 'User has already been invited' });
        }

        // Add to invited members
        if (!community.invitedMembers) {
            community.invitedMembers = [];
        }
        community.invitedMembers.push(userToInvite.us_id);
        await community.save();

        // Send notification to invited user
        await sendNotification(
            [userToInvite.us_id],
            'invitation',
            `You've been invited to join ${community.Name}`,
            communityId
        );

        res.json({ success: true, message: 'Invitation sent successfully' });

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Failed to send invitation' });
    }
};

const markProblemSolved = async (req, res) => {
    try {
        const userId = req.session.user;
        const { problemId, communityId, worker_remarks } = req.body;

        if (!userId) {
            return res.redirect('/login');
        }

        const problem = await Problems.findOne({ pb_id: problemId });
        if (!problem) {
            return res.status(404).json({ error: 'Problem not found' });
        }

        const community = await Communities.findOne({ gp_id: communityId });
        const user = await Accounts.findOne({ us_id: userId });
        const isWorker = user.role === 'worker';
        const isOwner = community.members.length > 0 && community.members[0] === userId;

        // Enforce community setting: onlyWorkersCanSolve
        if (community.settings && community.settings.onlyWorkersCanSolve) {
            if (!isWorker) {
                return res.status(403).json({ error: 'Only workers can mark problems as solved in this community' });
            }
        } else {
            // default behavior: allow workers or owner
            if (!isWorker && !isOwner) {
                return res.status(403).json({ error: 'Only workers or owners can mark problems as solved' });
            }
        }

        // Update problem with worker remarks and mark as solved
        await Problems.updateOne(
            { pb_id: problemId },
            {
                $set: {
                    solved: true,
                    solved_at: new Date(), 
                    worker_remarks: worker_remarks || '',
                    solved_by: userId
                }
            }
        );

        // Send notification to problem reporter
        if (problem.us_id !== userId) {
            await sendNotification(
                [problem.us_id],
                'problem_solved',
                `Your problem has been solved by ${user.Name}. Check their remarks!`,
                communityId,
                problemId
            );
        }

        res.redirect(`/com/${communityId}?success=Problem marked as solved`);

    } catch (error) {
        console.log(error);
        res.redirect(`/com/${communityId}?error=Failed to update problem`);
    }
};

const confirmSolution = async (req, res) => {
    try {
        const userId = req.session.user;
        const { problemId, communityId } = req.body;

        if (!userId) {
            return res.redirect('/login');
        }

        const problem = await Problems.findOne({ pb_id: problemId });
        if (!problem) {
            return res.status(404).json({ error: 'Problem not found' });
        }

        // Only the problem reporter can confirm the solution
        if (problem.us_id !== userId) {
            return res.status(403).json({ error: 'Only the problem reporter can confirm solution' });
        }

        // Mark as confirmed solved
        await Problems.updateOne(
            { pb_id: problemId },
            { $set: { confirmed_solved: true } }
        );

        // Send notification to the worker who solved it
        if (problem.solved_by && problem.solved_by !== userId) {
            await sendNotification(
                [problem.solved_by],
                'solution_confirmed',
                `The user confirmed your solution to their problem!`,
                communityId,
                problemId
            );
        }

        res.redirect(`/com/${communityId}?success=Solution confirmed`);

    } catch (error) {
        console.log(error);
        res.redirect(`/com/${communityId}?error=Failed to confirm solution`);
    }
};

// Get user profile information
const getUserProfile = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.redirect('/login');
        }

        const user = await Accounts.findOne({ us_id: userId });
        if (!user) {
            return res.redirect('/login');
        }

        res.json({
            success: true,
            user: {
                name: user.Name,
                mobile: user.Mob_no,
                address: user.Address,
                role: user.role,
                profession: user.Proff
            }
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Failed to get user profile' });
    }
};


// Get notifications for current user
const getNotifications = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.json([]);
        }

        const user = await Accounts.findOne({ us_id: userId });
        if (!user || !user.notification) {
            return res.json([]);
        }

        // Sort notifications by timestamp (newest first) and return
        const notifications = user.notification
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 50); // Limit to 50 most recent

        res.json(notifications);

    } catch (error) {
        console.log(error);
        res.json([]);
    }
};

// Mark notification as read
const markNotificationRead = async (req, res) => {
    try {
        const userId = req.session.user;
        const { notificationId } = req.body;

        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const user = await Accounts.findOne({ us_id: userId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Mark notification as read
        const notificationIndex = user.notification.findIndex(notif => notif.id === notificationId);
        if (notificationIndex !== -1) {
            user.notification[notificationIndex].read = true;
            await user.save();
        }

        res.json({ success: true });

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
};

// Mark all notifications as read
const markAllNotificationsRead = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const user = await Accounts.findOne({ us_id: userId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Mark all notifications as read
        user.notification.forEach(notif => {
            notif.read = true;
        });

        await user.save();

        res.json({ success: true });

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
};

const discoverCommunities = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.redirect('/login');
        }

        const user = await Accounts.findOne({ us_id: userId });

        // Get all public communities that user is not a member of
        const publicCommunities = await Communities.find({
            isPublic: true,
            members: { $ne: userId }
        }).sort({ createdAt: -1 });

        // Get user's current communities for reference
        const userCommunities = await Communities.find({
            members: { $in: [userId] }
        });

        res.render('discover', {
            user: user,
            communities: publicCommunities,
            userCommunities: userCommunities
        });

    } catch (error) {
        console.log(error);
        res.redirect('/dashboard?error=Failed to load communities');
    }
}

// Search Communities
const searchCommunities = async (req, res) => {
    try {
        const userId = req.session.user;
        const { query, category } = req.query;

        if (!userId) {
            return res.json([]);
        }

        let searchFilter = {
            isPublic: true,
            members: { $ne: userId }
        };

        if (query) {
            searchFilter.$or = [
                { Name: { $regex: query, $options: 'i' } },
                { Description: { $regex: query, $options: 'i' } }
            ];
        }

        if (category && category !== 'all') {
            searchFilter.Category = { $in: [category] };
        }

        const communities = await Communities.find(searchFilter).sort({ createdAt: -1 });
        res.json(communities);

    } catch (error) {
        console.log(error);
        res.json([]);
    }
}

// Join Community from Discover Page
const joinCommunity = async (req, res) => {
    try {
        const userId = req.session.user;
        const communityId = req.params.id;

        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const community = await Communities.findOne({ gp_id: communityId });
        if (!community) {
            return res.status(404).json({ error: 'Community not found' });
        }

        // Prevent joining private/invite-only communities
        if (!community.isPublic) {
            return res.status(403).json({ error: 'Community is private' });
        }

        if (community.settings && community.settings.allowPublicJoin === false) {
            return res.status(403).json({ error: 'This community is invite-only' });
        }

        // Check if user is already a member
        if (community.members.includes(userId)) {
            return res.status(400).json({ error: 'Already a member' });
        }

        // Add user to community
        community.members.push(userId);
        await community.save();

        // Send notification to community owner about new member
        if (community.members.length > 0) {
            const ownerId = community.members[0];
            const newMember = await Accounts.findOne({ us_id: userId });

            if (ownerId !== userId) {
                await sendNotification(
                    [ownerId],
                    'new_member',
                    `${newMember.Name} joined your community ${community.Name}`,
                    communityId
                );
            }
        }

        res.json({ success: true, message: 'Successfully joined community' });

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Failed to join community' });
    }
}

// Profile Settings Page
const profileSettings = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.redirect('/login');
        }

        const user = await Accounts.findOne({ us_id: userId });
        res.render('profile', {
            user: user,
            msg: req.query.msg
        });

    } catch (error) {
        console.log(error);
        res.redirect('/dashboard?error=Failed to load profile');
    }
}

// Update community settings (owner only)
const updateCommunitySettings = async (req, res) => {
    try {
        const userId = req.session.user;
        const communityId = req.params.id;
        const { isPublic, allowPublicJoin, onlyWorkersCanSolve } = req.body;

        // Debug logging to help diagnose form submission issues
        console.log('updateCommunitySettings called for', communityId, 'by user', userId);
        console.log('Incoming form values -> isPublic:', isPublic, 'allowPublicJoin:', allowPublicJoin, 'onlyWorkersCanSolve:', onlyWorkersCanSolve);

        if (!userId) return res.status(401).json({ error: 'Not authenticated' });

        const community = await Communities.findOne({ gp_id: communityId });
        if (!community) return res.status(404).json({ error: 'Community not found' });

        // Only owner (first member) can update settings
        const isOwner = community.members.length > 0 && community.members[0] === userId;
        if (!isOwner) return res.status(403).json({ error: 'Only community owner can update settings' });

        // Helper to coerce form values to boolean. Handles arrays (multiple values sent), 'on', 'true', '1', true, 'false'.
        function parseBool(val) {
            if (typeof val === 'undefined' || val === null) return undefined;
            if (Array.isArray(val)) {
                // Prefer the last occurrence (checkbox pattern: hidden then checkbox)
                val = val[val.length - 1];
            }
            if (typeof val === 'boolean') return val;
            const s = String(val).toLowerCase();
            if (s === 'true' || s === '1' || s === 'on') return true;
            if (s === 'false' || s === '0' || s === 'off') return false;
            return undefined;
        }

        // Apply updates (coerce values)
        const parsedIsPublic = parseBool(isPublic);
        const parsedAllowPublicJoin = parseBool(allowPublicJoin);
        const parsedOnlyWorkersCanSolve = parseBool(onlyWorkersCanSolve);

        if (typeof parsedIsPublic !== 'undefined') community.isPublic = parsedIsPublic;
        if (!community.settings) community.settings = {};
        if (typeof parsedAllowPublicJoin !== 'undefined') community.settings.allowPublicJoin = parsedAllowPublicJoin;
        if (typeof parsedOnlyWorkersCanSolve !== 'undefined') community.settings.onlyWorkersCanSolve = parsedOnlyWorkersCanSolve;

        await community.save();

        // If request is from a form submit, redirect back; else send JSON
        if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
            return res.json({ success: true, message: 'Settings updated' });
        }

        res.redirect(`/com/${communityId}?success=Settings updated`);
    } catch (error) {
        console.log('Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
};

// Update Profile
const updateProfile = async (req, res) => {
    try {
        const userId = req.session.user;
        const { name, mobile, profession, address } = req.body;

        if (!userId) {
            return res.redirect('/login');
        }

        // Check if mobile number is already taken by another user
        const existingUser = await Accounts.findOne({
            Mob_no: mobile,
            us_id: { $ne: userId }
        });

        if (existingUser) {
            return res.redirect('/profile?msg=Mobile number already taken');
        }

        // Update user profile
        await Accounts.updateOne(
            { us_id: userId },
            {
                $set: {
                    Name: name,
                    Mob_no: mobile,
                    Proff: profession,
                    Address: address
                }
            }
        );

        res.redirect('/profile?msg=Profile updated successfully');

    } catch (error) {
        console.log(error);
        res.redirect('/profile?msg=Error updating profile');
    }
}

const forgotPinPage = async (req, res) => {
    try {
        res.render("forgot-pin");
    } catch (error) {
        console.log(error);
    }
}

// Reset PIN Function
const resetPin = async (req, res) => {
    try {
        const { mobile, oldPin, newPin, confirmPin } = req.body;

        // Basic validation
        if (!mobile || !oldPin || !newPin || !confirmPin) {
            return res.render("forgot-pin", {
                msg: "All fields are required",
                formData: req.body
            });
        }

        // Check if new PIN matches confirm PIN
        if (newPin !== confirmPin) {
            return res.render("forgot-pin", {
                msg: "New PIN and Confirm PIN do not match",
                formData: req.body
            });
        }

        // Check if old and new PIN are different
        if (oldPin === newPin) {
            return res.render("forgot-pin", {
                msg: "New PIN cannot be the same as old PIN",
                formData: req.body
            });
        }

        // PIN format validation
        const pinRegex = /^\d{4,6}$/;
        if (!pinRegex.test(oldPin) || !pinRegex.test(newPin)) {
            return res.render("forgot-pin", {
                msg: "PIN must be 4-6 digits only",
                formData: req.body
            });
        }

        // Find user by mobile number
        const user = await Accounts.findOne({ Mob_no: mobile });

        if (!user) {
            return res.render("forgot-pin", {
                msg: "No account found with this mobile number",
                formData: req.body
            });
        }

        // Verify old PIN
        if (user.PIN !== oldPin) {
            return res.render("forgot-pin", {
                msg: "Old PIN is incorrect. If you forgot your old PIN, please contact developerpuneet2010@gmail.com",
                formData: req.body
            });
        }

        // Update PIN
        user.PIN = newPin;
        await user.save();

        // Send success message
        res.render("forgot-pin", {
            msg: "PIN reset successfully! You can now login with your new PIN.",
            formData: null
        });

    } catch (error) {
        console.log(error);
        res.render("forgot-pin", {
            msg: "Error resetting PIN. Please try again.",
            formData: req.body
        });
    }
}

// * exporting functions 
module.exports = {
    Load,
    DashboardLoad,
    create_account,
    getting_account,
    createCommunity,
    getCommunityPage,
    raiseProblem,
    markProblemSolved,
    joinCommunity,
    login_user,
    logout_user,
    inviteMember,
    acceptInvitation,
    getNotifications,
    markNotificationRead,
    discoverCommunities,
    joinCommunityPublic,
    markAllNotificationsRead,
    getUserProfile,
    confirmSolution,
    discoverCommunities,
    searchCommunities,
    joinCommunity,
    updateCommunitySettings,
    updateProfile,
    profileSettings,
    forgotPinPage,
    resetPin
}