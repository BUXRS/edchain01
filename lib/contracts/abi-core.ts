// Core Contract ABI
// Contract Address: 0xBb51Dc84f0b35d3344f777543CA6549F9427B313
// Purpose: Write operations (issue, revoke, register, etc.)

export const CORE_CONTRACT_ABI = [
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "renderer_",
				"type": "address"
			}
		],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"inputs": [],
		"name": "AlreadyApproved",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "AlreadyInitialized",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "ContractPaused",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "DegreeAlreadyRevoked",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "DuplicateDegree",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "EmptyString",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "InvalidGPA",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "InvalidUniversity",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "InvalidYear",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "MaxVerifiersReached",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "NewOwnerIsZeroAddress",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "NoExpiredRequests",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "NoHandoverRequest",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "NoVerifiersConfigured",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "NonexistentToken",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "NotApproved",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "NotAuthorizedIssuer",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "NotAuthorizedRevoker",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "NotAuthorizedVerifier",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "NotUniversityAdmin",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "Reentrancy",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "RequestAlreadyExecuted",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "RequestExpired",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "RequestNotFound",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "Soulbound",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "StringTooLong",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "Unauthorized",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "UniversityAlreadyDeleted",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "UniversityNotActive",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "VerifierAlreadyExists",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "VerifierNotFound",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "ZeroAddress",
		"type": "error"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "owner",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "approved",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			}
		],
		"name": "Approval",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "owner",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "operator",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "bool",
				"name": "approved",
				"type": "bool"
			}
		],
		"name": "ApprovalForAll",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "requestId",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "verifier",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "bool",
				"name": "isDegreeRequest",
				"type": "bool"
			}
		],
		"name": "ApprovalWithdrawn",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "bool",
				"name": "isPaused",
				"type": "bool"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "by",
				"type": "address"
			}
		],
		"name": "ContractPausedToggled",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "uint64",
				"name": "universityId",
				"type": "uint64"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "recipient",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "requestId",
				"type": "uint256"
			}
		],
		"name": "DegreeIssued",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "requestId",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "verifier",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint8",
				"name": "approvals",
				"type": "uint8"
			},
			{
				"indexed": false,
				"internalType": "uint8",
				"name": "required",
				"type": "uint8"
			}
		],
		"name": "DegreeRequestApproved",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "requestId",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "verifier",
				"type": "address"
			}
		],
		"name": "DegreeRequestRejected",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "requestId",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "uint64",
				"name": "universityId",
				"type": "uint64"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "recipient",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "requester",
				"type": "address"
			}
		],
		"name": "DegreeRequested",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "uint64",
				"name": "universityId",
				"type": "uint64"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "requestId",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "revoker",
				"type": "address"
			}
		],
		"name": "DegreeRevoked",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "requestId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "bool",
				"name": "isDegreeRequest",
				"type": "bool"
			}
		],
		"name": "ExpiredRequestCleaned",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint64",
				"name": "universityId",
				"type": "uint64"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "issuer",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "bool",
				"name": "status",
				"type": "bool"
			}
		],
		"name": "IssuerUpdated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "pendingOwner",
				"type": "address"
			}
		],
		"name": "OwnershipHandoverCanceled",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "pendingOwner",
				"type": "address"
			}
		],
		"name": "OwnershipHandoverRequested",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "oldOwner",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "newOwner",
				"type": "address"
			}
		],
		"name": "OwnershipTransferred",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "oldRenderer",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "newRenderer",
				"type": "address"
			}
		],
		"name": "RendererUpdated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "requestId",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "verifier",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint8",
				"name": "approvals",
				"type": "uint8"
			},
			{
				"indexed": false,
				"internalType": "uint8",
				"name": "required",
				"type": "uint8"
			}
		],
		"name": "RevocationApproved",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "requestId",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "verifier",
				"type": "address"
			}
		],
		"name": "RevocationRejected",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "requestId",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "uint64",
				"name": "universityId",
				"type": "uint64"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "requester",
				"type": "address"
			}
		],
		"name": "RevocationRequested",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint64",
				"name": "universityId",
				"type": "uint64"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "revoker",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "bool",
				"name": "status",
				"type": "bool"
			}
		],
		"name": "RevokerUpdated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "from",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "to",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			}
		],
		"name": "Transfer",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint64",
				"name": "universityId",
				"type": "uint64"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "oldAdmin",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "newAdmin",
				"type": "address"
			}
		],
		"name": "UniversityAdminChanged",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint64",
				"name": "universityId",
				"type": "uint64"
			}
		],
		"name": "UniversityDeleted",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint64",
				"name": "universityId",
				"type": "uint64"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "nameEn",
				"type": "string"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "nameAr",
				"type": "string"
			}
		],
		"name": "UniversityInfoUpdated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint64",
				"name": "universityId",
				"type": "uint64"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "nameEn",
				"type": "string"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "admin",
				"type": "address"
			}
		],
		"name": "UniversityRegistered",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint64",
				"name": "universityId",
				"type": "uint64"
			},
			{
				"indexed": false,
				"internalType": "bool",
				"name": "isActive",
				"type": "bool"
			}
		],
		"name": "UniversityStatusChanged",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint64",
				"name": "universityId",
				"type": "uint64"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "verifier",
				"type": "address"
			}
		],
		"name": "VerifierAdded",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint64",
				"name": "universityId",
				"type": "uint64"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "verifier",
				"type": "address"
			}
		],
		"name": "VerifierRemoved",
		"type": "event"
	},
	{
		"inputs": [],
		"name": "MAX_MEDIUM_STRING",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "MAX_SHORT_STRING",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "MAX_VERIFIERS",
		"outputs": [
			{
				"internalType": "uint8",
				"name": "",
				"type": "uint8"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "REQUEST_EXPIRY",
		"outputs": [
			{
				"internalType": "uint40",
				"name": "",
				"type": "uint40"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "VERSION",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint64",
				"name": "id",
				"type": "uint64"
			},
			{
				"internalType": "address",
				"name": "v",
				"type": "address"
			}
		],
		"name": "addVerifier",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "approve",
		"outputs": [],
		"stateMutability": "pure",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "requestId",
				"type": "uint256"
			}
		],
		"name": "approveDegreeRequest",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "requestId",
				"type": "uint256"
			}
		],
		"name": "approveRevocationRequest",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "owner_",
				"type": "address"
			}
		],
		"name": "balanceOf",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "cancelOwnershipHandover",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint64",
				"name": "uniId",
				"type": "uint64"
			},
			{
				"internalType": "uint256",
				"name": "max",
				"type": "uint256"
			}
		],
		"name": "cleanExpiredDegreeRequests",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "cleaned",
				"type": "uint256"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint64",
				"name": "uniId",
				"type": "uint64"
			},
			{
				"internalType": "uint256",
				"name": "max",
				"type": "uint256"
			}
		],
		"name": "cleanExpiredRevocationRequests",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "cleaned",
				"type": "uint256"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "pendingOwner",
				"type": "address"
			}
		],
		"name": "completeOwnershipHandover",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "degreeRequestApprovals",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "degreeRequests",
		"outputs": [
			{
				"internalType": "uint64",
				"name": "universityId",
				"type": "uint64"
			},
			{
				"internalType": "address",
				"name": "recipient",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "requester",
				"type": "address"
			},
			{
				"internalType": "uint16",
				"name": "gpa",
				"type": "uint16"
			},
			{
				"internalType": "uint16",
				"name": "year",
				"type": "uint16"
			},
			{
				"internalType": "uint8",
				"name": "approvalCount",
				"type": "uint8"
			},
			{
				"internalType": "uint40",
				"name": "createdAt",
				"type": "uint40"
			},
			{
				"internalType": "bool",
				"name": "executed",
				"type": "bool"
			},
			{
				"internalType": "bool",
				"name": "rejected",
				"type": "bool"
			},
			{
				"internalType": "string",
				"name": "nameAr",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "nameEn",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "facultyAr",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "facultyEn",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "majorAr",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "majorEn",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "degreeNameAr",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "degreeNameEn",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint64",
				"name": "id",
				"type": "uint64"
			}
		],
		"name": "deleteUniversity",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			}
		],
		"name": "getApproved",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			}
		],
		"name": "getDegree",
		"outputs": [
			{
				"components": [
					{
						"internalType": "uint64",
						"name": "universityId",
						"type": "uint64"
					},
					{
						"internalType": "uint16",
						"name": "gpa",
						"type": "uint16"
					},
					{
						"internalType": "uint16",
						"name": "year",
						"type": "uint16"
					},
					{
						"internalType": "bool",
						"name": "isRevoked",
						"type": "bool"
					},
					{
						"internalType": "uint40",
						"name": "issuedAt",
						"type": "uint40"
					},
					{
						"internalType": "uint40",
						"name": "revokedAt",
						"type": "uint40"
					},
					{
						"internalType": "address",
						"name": "issuer",
						"type": "address"
					},
					{
						"internalType": "address",
						"name": "revoker",
						"type": "address"
					},
					{
						"internalType": "string",
						"name": "nameAr",
						"type": "string"
					},
					{
						"internalType": "string",
						"name": "nameEn",
						"type": "string"
					},
					{
						"internalType": "string",
						"name": "facultyAr",
						"type": "string"
					},
					{
						"internalType": "string",
						"name": "facultyEn",
						"type": "string"
					},
					{
						"internalType": "string",
						"name": "majorAr",
						"type": "string"
					},
					{
						"internalType": "string",
						"name": "majorEn",
						"type": "string"
					},
					{
						"internalType": "string",
						"name": "degreeNameAr",
						"type": "string"
					},
					{
						"internalType": "string",
						"name": "degreeNameEn",
						"type": "string"
					}
				],
				"internalType": "struct UniversityDegreeProtocolCore.Degree",
				"name": "",
				"type": "tuple"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			}
		],
		"name": "getDegreeInfo",
		"outputs": [
			{
				"components": [
					{
						"internalType": "uint64",
						"name": "universityId",
						"type": "uint64"
					},
					{
						"internalType": "uint16",
						"name": "gpa",
						"type": "uint16"
					},
					{
						"internalType": "uint16",
						"name": "year",
						"type": "uint16"
					},
					{
						"internalType": "bool",
						"name": "isRevoked",
						"type": "bool"
					},
					{
						"internalType": "uint40",
						"name": "issuedAt",
						"type": "uint40"
					},
					{
						"internalType": "uint40",
						"name": "revokedAt",
						"type": "uint40"
					},
					{
						"internalType": "address",
						"name": "issuer",
						"type": "address"
					},
					{
						"internalType": "address",
						"name": "revoker",
						"type": "address"
					},
					{
						"internalType": "string",
						"name": "nameAr",
						"type": "string"
					},
					{
						"internalType": "string",
						"name": "nameEn",
						"type": "string"
					},
					{
						"internalType": "string",
						"name": "facultyAr",
						"type": "string"
					},
					{
						"internalType": "string",
						"name": "facultyEn",
						"type": "string"
					},
					{
						"internalType": "string",
						"name": "majorAr",
						"type": "string"
					},
					{
						"internalType": "string",
						"name": "majorEn",
						"type": "string"
					},
					{
						"internalType": "string",
						"name": "degreeNameAr",
						"type": "string"
					},
					{
						"internalType": "string",
						"name": "degreeNameEn",
						"type": "string"
					}
				],
				"internalType": "struct UniversityDegreeProtocolCore.Degree",
				"name": "",
				"type": "tuple"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			}
		],
		"name": "getIssuer",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint64",
				"name": "id",
				"type": "uint64"
			}
		],
		"name": "getIssuers",
		"outputs": [
			{
				"internalType": "address[]",
				"name": "",
				"type": "address[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint64",
				"name": "id",
				"type": "uint64"
			}
		],
		"name": "getPendingDegreeRequestCount",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint64",
				"name": "id",
				"type": "uint64"
			}
		],
		"name": "getPendingDegreeRequests",
		"outputs": [
			{
				"internalType": "uint256[]",
				"name": "",
				"type": "uint256[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint64",
				"name": "id",
				"type": "uint64"
			}
		],
		"name": "getPendingRevocationRequestCount",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint64",
				"name": "id",
				"type": "uint64"
			}
		],
		"name": "getPendingRevocationRequests",
		"outputs": [
			{
				"internalType": "uint256[]",
				"name": "",
				"type": "uint256[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint64",
				"name": "id",
				"type": "uint64"
			}
		],
		"name": "getRequiredApprovals",
		"outputs": [
			{
				"internalType": "uint8",
				"name": "",
				"type": "uint8"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			}
		],
		"name": "getRevoker",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint64",
				"name": "id",
				"type": "uint64"
			}
		],
		"name": "getRevokers",
		"outputs": [
			{
				"internalType": "address[]",
				"name": "",
				"type": "address[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "student",
				"type": "address"
			}
		],
		"name": "getStudentDegreeCount",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "student",
				"type": "address"
			}
		],
		"name": "getStudentDegrees",
		"outputs": [
			{
				"internalType": "uint256[]",
				"name": "",
				"type": "uint256[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint64",
				"name": "id",
				"type": "uint64"
			}
		],
		"name": "getUniversity",
		"outputs": [
			{
				"components": [
					{
						"internalType": "address",
						"name": "admin",
						"type": "address"
					},
					{
						"internalType": "string",
						"name": "nameAr",
						"type": "string"
					},
					{
						"internalType": "string",
						"name": "nameEn",
						"type": "string"
					},
					{
						"internalType": "bool",
						"name": "exists",
						"type": "bool"
					},
					{
						"internalType": "bool",
						"name": "isActive",
						"type": "bool"
					},
					{
						"internalType": "bool",
						"name": "isDeleted",
						"type": "bool"
					}
				],
				"internalType": "struct UniversityDegreeProtocolCore.University",
				"name": "",
				"type": "tuple"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint64",
				"name": "id",
				"type": "uint64"
			}
		],
		"name": "getUniversityDegreeCount",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint64",
				"name": "id",
				"type": "uint64"
			}
		],
		"name": "getUniversityDegrees",
		"outputs": [
			{
				"internalType": "uint256[]",
				"name": "",
				"type": "uint256[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint64",
				"name": "id",
				"type": "uint64"
			}
		],
		"name": "getUniversityRevokedCount",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint64",
				"name": "id",
				"type": "uint64"
			}
		],
		"name": "getUniversityStats",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "total",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "revoked",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "pendingD",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "pendingR",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint64",
				"name": "id",
				"type": "uint64"
			}
		],
		"name": "getUniversityVerifiers",
		"outputs": [
			{
				"internalType": "address[]",
				"name": "result",
				"type": "address[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint64",
				"name": "id",
				"type": "uint64"
			}
		],
		"name": "getVerifiers",
		"outputs": [
			{
				"internalType": "address[]",
				"name": "result",
				"type": "address[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint64",
				"name": "id",
				"type": "uint64"
			},
			{
				"internalType": "address",
				"name": "issuer",
				"type": "address"
			}
		],
		"name": "grantIssuer",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint64",
				"name": "id",
				"type": "uint64"
			},
			{
				"internalType": "address",
				"name": "revoker",
				"type": "address"
			}
		],
		"name": "grantRevoker",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "requestId",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "verifier",
				"type": "address"
			}
		],
		"name": "hasApprovedDegreeRequest",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "requestId",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "verifier",
				"type": "address"
			}
		],
		"name": "hasApprovedRevocationRequest",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "isApprovedForAll",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "pure",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "requestId",
				"type": "uint256"
			}
		],
		"name": "isDegreeRequestExpired",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint64",
				"name": "universityId",
				"type": "uint64"
			},
			{
				"internalType": "address",
				"name": "account",
				"type": "address"
			}
		],
		"name": "isIssuer",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "requestId",
				"type": "uint256"
			}
		],
		"name": "isRevocationRequestExpired",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint64",
				"name": "universityId",
				"type": "uint64"
			},
			{
				"internalType": "address",
				"name": "account",
				"type": "address"
			}
		],
		"name": "isRevoker",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			}
		],
		"name": "isValidDegree",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint64",
				"name": "",
				"type": "uint64"
			},
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "isVerifier",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint64",
				"name": "universityId",
				"type": "uint64"
			},
			{
				"internalType": "address",
				"name": "account",
				"type": "address"
			}
		],
		"name": "isVerifierAccount",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint64",
				"name": "",
				"type": "uint64"
			},
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "issuers",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "name",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "pure",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "nextDegreeRequestId",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "nextRevocationRequestId",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "nextTokenId",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "nextUniversityId",
		"outputs": [
			{
				"internalType": "uint64",
				"name": "",
				"type": "uint64"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "owner",
		"outputs": [
			{
				"internalType": "address",
				"name": "result",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			}
		],
		"name": "ownerOf",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "pendingOwner",
				"type": "address"
			}
		],
		"name": "ownershipHandoverExpiresAt",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "result",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "paused",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "admin",
				"type": "address"
			},
			{
				"internalType": "string",
				"name": "nameAr",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "nameEn",
				"type": "string"
			}
		],
		"name": "registerUniversity",
		"outputs": [
			{
				"internalType": "uint64",
				"name": "id",
				"type": "uint64"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "requestId",
				"type": "uint256"
			}
		],
		"name": "rejectDegreeRequest",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "requestId",
				"type": "uint256"
			}
		],
		"name": "rejectRevocationRequest",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint64",
				"name": "id",
				"type": "uint64"
			},
			{
				"internalType": "address",
				"name": "v",
				"type": "address"
			}
		],
		"name": "removeVerifier",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "renderer",
		"outputs": [
			{
				"internalType": "contract IDegreeRenderer",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "renounceOwnership",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint64",
				"name": "universityId",
				"type": "uint64"
			},
			{
				"internalType": "address",
				"name": "recipient",
				"type": "address"
			},
			{
				"internalType": "string",
				"name": "nameAr",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "nameEn",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "facultyAr",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "facultyEn",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "majorAr",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "majorEn",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "degreeNameAr",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "degreeNameEn",
				"type": "string"
			},
			{
				"internalType": "uint16",
				"name": "gpa",
				"type": "uint16"
			},
			{
				"internalType": "uint16",
				"name": "year",
				"type": "uint16"
			}
		],
		"name": "requestDegree",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "requestId",
				"type": "uint256"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "requestOwnershipHandover",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			}
		],
		"name": "requestRevocation",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "requestId",
				"type": "uint256"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "revocationRequestApprovals",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "revocationRequests",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			},
			{
				"internalType": "uint64",
				"name": "universityId",
				"type": "uint64"
			},
			{
				"internalType": "address",
				"name": "requester",
				"type": "address"
			},
			{
				"internalType": "uint8",
				"name": "approvalCount",
				"type": "uint8"
			},
			{
				"internalType": "uint40",
				"name": "createdAt",
				"type": "uint40"
			},
			{
				"internalType": "bool",
				"name": "executed",
				"type": "bool"
			},
			{
				"internalType": "bool",
				"name": "rejected",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint64",
				"name": "id",
				"type": "uint64"
			},
			{
				"internalType": "address",
				"name": "issuer",
				"type": "address"
			}
		],
		"name": "revokeIssuer",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint64",
				"name": "id",
				"type": "uint64"
			},
			{
				"internalType": "address",
				"name": "revoker",
				"type": "address"
			}
		],
		"name": "revokeRevoker",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint64",
				"name": "",
				"type": "uint64"
			},
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "revokers",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "safeTransferFrom",
		"outputs": [],
		"stateMutability": "pure",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			},
			{
				"internalType": "bytes",
				"name": "",
				"type": "bytes"
			}
		],
		"name": "safeTransferFrom",
		"outputs": [],
		"stateMutability": "pure",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			},
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"name": "setApprovalForAll",
		"outputs": [],
		"stateMutability": "pure",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "r",
				"type": "address"
			}
		],
		"name": "setRenderer",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint64",
				"name": "id",
				"type": "uint64"
			},
			{
				"internalType": "bool",
				"name": "isActive",
				"type": "bool"
			}
		],
		"name": "setUniversityStatus",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "bytes4",
				"name": "interfaceId",
				"type": "bytes4"
			}
		],
		"name": "supportsInterface",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "pure",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "symbol",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "pure",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "togglePause",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			}
		],
		"name": "tokenURI",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "totalSupply",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "transferFrom",
		"outputs": [],
		"stateMutability": "pure",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "newOwner",
				"type": "address"
			}
		],
		"name": "transferOwnership",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint64",
				"name": "",
				"type": "uint64"
			}
		],
		"name": "universities",
		"outputs": [
			{
				"internalType": "address",
				"name": "admin",
				"type": "address"
			},
			{
				"internalType": "string",
				"name": "nameAr",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "nameEn",
				"type": "string"
			},
			{
				"internalType": "bool",
				"name": "exists",
				"type": "bool"
			},
			{
				"internalType": "bool",
				"name": "isActive",
				"type": "bool"
			},
			{
				"internalType": "bool",
				"name": "isDeleted",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint64",
				"name": "id",
				"type": "uint64"
			},
			{
				"internalType": "address",
				"name": "newAdmin",
				"type": "address"
			}
		],
		"name": "updateUniversityAdmin",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint64",
				"name": "id",
				"type": "uint64"
			},
			{
				"internalType": "string",
				"name": "nameAr",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "nameEn",
				"type": "string"
			}
		],
		"name": "updateUniversityInfo",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint64",
				"name": "",
				"type": "uint64"
			}
		],
		"name": "verifierCount",
		"outputs": [
			{
				"internalType": "uint8",
				"name": "",
				"type": "uint8"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "requestId",
				"type": "uint256"
			}
		],
		"name": "withdrawDegreeApproval",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "requestId",
				"type": "uint256"
			}
		],
		"name": "withdrawRevocationApproval",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	}
] as const
