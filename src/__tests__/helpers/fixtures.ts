export const GROUP_ID = "g1";
export const OTHER_GROUP_ID = "g2";

export const group = { id: GROUP_ID, name: "Grupo 1", image: null };

export const otherGroup = { id: OTHER_GROUP_ID, name: "Grupo 2", image: null };

/**
 * User row as `requireGroupMember` reads it: `memberships` is already filtered
 * by the group being checked, so an empty array means "not a member".
 */
export function memberUser(role = "MEMBER", userId = "u1", groupId = GROUP_ID) {
    return {
        id: userId,
        name: "User 1",
        email: null,
        isAdmin: false,
        memberships: [{ id: `mb-${userId}-${groupId}`, userId, groupId, role }],
    };
}

export function outsiderUser(userId = "u2") {
    return {
        id: userId,
        name: "User 2",
        email: null,
        isAdmin: false,
        memberships: [],
    };
}

export function adminUser(userId = "admin") {
    return {
        id: userId,
        name: "Admin",
        email: null,
        isAdmin: true,
        memberships: [],
    };
}
