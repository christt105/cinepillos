import { GET as getProposals, POST as postProposal } from "@/app/api/groups/[groupId]/proposals/route";
import { DELETE as deleteProposal } from "@/app/api/groups/[groupId]/proposals/[id]/route";
import { GET as getMeetings, POST as postMeeting } from "@/app/api/groups/[groupId]/meetings/route";
import { POST as postCandidate } from "@/app/api/groups/[groupId]/meetings/[id]/candidates/route";
import { DELETE as deleteCandidate } from "@/app/api/groups/[groupId]/meetings/[id]/candidates/[candidateId]/route";
import { PATCH as patchConclude } from "@/app/api/groups/[groupId]/meetings/[id]/conclude/route";
import { POST as postVote } from "@/app/api/groups/[groupId]/vote/route";
import { POST as postActiveGroup } from "@/app/api/users/activeGroup/route";

const BASE = "http://localhost";

const jsonRequest = (url: string, method: string, body?: unknown) =>
    new Request(`${BASE}${url}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
    });

const context = <T extends Record<string, string>>(params: T) =>
    ({ params: Promise.resolve(params) }) as never;

/**
 * Thin wrappers around the route handlers so the tests read like the HTTP calls
 * the client makes, path parameters included.
 */
export const api = {
    listProposals: (groupId: string, scope?: string) =>
        getProposals(
            jsonRequest(
                `/api/groups/${groupId}/proposals${scope ? `?scope=${scope}` : ""}`,
                "GET"
            ),
            context({ groupId })
        ),

    createProposal: (groupId: string, body: unknown) =>
        postProposal(jsonRequest(`/api/groups/${groupId}/proposals`, "POST", body), context({ groupId })),

    deleteProposal: (groupId: string, id: string) =>
        deleteProposal(jsonRequest(`/api/groups/${groupId}/proposals/${id}`, "DELETE"), context({ groupId, id })),

    listMeetings: (groupId: string) =>
        getMeetings(jsonRequest(`/api/groups/${groupId}/meetings`, "GET"), context({ groupId })),

    createMeeting: (groupId: string, body: unknown) =>
        postMeeting(jsonRequest(`/api/groups/${groupId}/meetings`, "POST", body), context({ groupId })),

    addCandidate: (groupId: string, meetingId: string, body: unknown) =>
        postCandidate(
            jsonRequest(`/api/groups/${groupId}/meetings/${meetingId}/candidates`, "POST", body),
            context({ groupId, id: meetingId })
        ),

    removeCandidate: (groupId: string, meetingId: string, candidateId: string) =>
        deleteCandidate(
            jsonRequest(
                `/api/groups/${groupId}/meetings/${meetingId}/candidates/${candidateId}`,
                "DELETE"
            ),
            context({ groupId, id: meetingId, candidateId })
        ),

    conclude: (groupId: string, meetingId: string) =>
        patchConclude(
            jsonRequest(`/api/groups/${groupId}/meetings/${meetingId}/conclude`, "PATCH"),
            context({ groupId, id: meetingId })
        ),

    vote: (groupId: string, candidateId: string) =>
        postVote(jsonRequest(`/api/groups/${groupId}/vote`, "POST", { candidateId }), context({ groupId })),

    setActiveGroup: (groupId: string) =>
        postActiveGroup(jsonRequest(`/api/users/activeGroup`, "POST", { groupId })),
};
