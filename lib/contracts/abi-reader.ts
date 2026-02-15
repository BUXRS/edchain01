// Reader Contract ABI
// Contract Address: 0x41c5ad012b71706Fc2a9510A17bB1f8Df857D275
// Purpose: Read-only operations (batch queries, helper functions)

export const READER_CONTRACT_ABI = [
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "coreAddress",
				"type": "address"
			}
		],
		"stateMutability": "nonpayable",
		"type": "constructor"
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
				"name": "universityId",
				"type": "uint64"
			},
			{
				"internalType": "address",
				"name": "account",
				"type": "address"
			}
		],
		"name": "checkRoles",
		"outputs": [
			{
				"internalType": "bool",
				"name": "isIssuer",
				"type": "bool"
			},
			{
				"internalType": "bool",
				"name": "isRevoker",
				"type": "bool"
			},
			{
				"internalType": "bool",
				"name": "isVerifier",
				"type": "bool"
			},
			{
				"internalType": "bool",
				"name": "isAdmin",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "core",
		"outputs": [
			{
				"internalType": "contract IUniversityDegreeProtocolCore",
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
				"name": "universityId",
				"type": "uint64"
			}
		],
		"name": "getAllRoleHolders",
		"outputs": [
			{
				"internalType": "address",
				"name": "admin",
				"type": "address"
			},
			{
				"internalType": "address[]",
				"name": "verifiers",
				"type": "address[]"
			},
			{
				"internalType": "address[]",
				"name": "issuers",
				"type": "address[]"
			},
			{
				"internalType": "address[]",
				"name": "revokers",
				"type": "address[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256[]",
				"name": "requestIds",
				"type": "uint256[]"
			}
		],
		"name": "getBatchDegreeRequests",
		"outputs": [
			{
				"components": [
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
				"internalType": "struct IUniversityDegreeProtocolCore.DegreeRequest[]",
				"name": "requests",
				"type": "tuple[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256[]",
				"name": "tokenIds",
				"type": "uint256[]"
			}
		],
		"name": "getBatchDegrees",
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
				"internalType": "struct IUniversityDegreeProtocolCore.Degree[]",
				"name": "degrees",
				"type": "tuple[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256[]",
				"name": "requestIds",
				"type": "uint256[]"
			}
		],
		"name": "getBatchRevocationRequests",
		"outputs": [
			{
				"components": [
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
				"internalType": "struct IUniversityDegreeProtocolCore.RevocationRequest[]",
				"name": "requests",
				"type": "tuple[]"
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
				"internalType": "struct IUniversityDegreeProtocolCore.Degree",
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
				"name": "requestId",
				"type": "uint256"
			}
		],
		"name": "getDegreeRequestWithApprovals",
		"outputs": [
			{
				"components": [
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
				"internalType": "struct IUniversityDegreeProtocolCore.DegreeRequest",
				"name": "request",
				"type": "tuple"
			},
			{
				"internalType": "address[]",
				"name": "approvers",
				"type": "address[]"
			},
			{
				"internalType": "bool",
				"name": "isExpired",
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
		"name": "getDegreeWithActors",
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
				"internalType": "struct IUniversityDegreeProtocolCore.Degree",
				"name": "degree",
				"type": "tuple"
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
				"name": "universityId",
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
				"name": "universityId",
				"type": "uint64"
			}
		],
		"name": "getPendingRequestsWithExpiry",
		"outputs": [
			{
				"internalType": "uint256[]",
				"name": "degreeRequests",
				"type": "uint256[]"
			},
			{
				"internalType": "bool[]",
				"name": "degreeExpired",
				"type": "bool[]"
			},
			{
				"internalType": "uint256[]",
				"name": "revocationRequests",
				"type": "uint256[]"
			},
			{
				"internalType": "bool[]",
				"name": "revocationExpired",
				"type": "bool[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getProtocolStats",
		"outputs": [
			{
				"internalType": "uint64",
				"name": "totalUniversities",
				"type": "uint64"
			},
			{
				"internalType": "uint256",
				"name": "totalDegrees",
				"type": "uint256"
			},
			{
				"internalType": "bool",
				"name": "isPaused",
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
				"internalType": "bool",
				"name": "isDegreeRequest",
				"type": "bool"
			}
		],
		"name": "getRequestStatus",
		"outputs": [
			{
				"internalType": "uint8",
				"name": "approvalCount",
				"type": "uint8"
			},
			{
				"internalType": "uint8",
				"name": "requiredApprovals",
				"type": "uint8"
			},
			{
				"internalType": "bool",
				"name": "isExpired",
				"type": "bool"
			},
			{
				"internalType": "bool",
				"name": "isExecuted",
				"type": "bool"
			},
			{
				"internalType": "bool",
				"name": "isRejected",
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
		"name": "getRevocationRequestWithApprovals",
		"outputs": [
			{
				"components": [
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
				"internalType": "struct IUniversityDegreeProtocolCore.RevocationRequest",
				"name": "request",
				"type": "tuple"
			},
			{
				"internalType": "address[]",
				"name": "approvers",
				"type": "address[]"
			},
			{
				"internalType": "bool",
				"name": "isExpired",
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
				"name": "universityId",
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
		"name": "getStudentProfile",
		"outputs": [
			{
				"internalType": "uint256[]",
				"name": "degrees",
				"type": "uint256[]"
			},
			{
				"internalType": "uint256",
				"name": "degreeCount",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "validCount",
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
				"name": "universityId",
				"type": "uint64"
			}
		],
		"name": "getUniversityDashboard",
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
				"internalType": "struct IUniversityDegreeProtocolCore.University",
				"name": "university",
				"type": "tuple"
			},
			{
				"internalType": "uint256[4]",
				"name": "stats",
				"type": "uint256[4]"
			},
			{
				"internalType": "address[]",
				"name": "verifiers",
				"type": "address[]"
			},
			{
				"internalType": "uint8",
				"name": "requiredApprovals",
				"type": "uint8"
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
				"name": "universityId",
				"type": "uint64"
			}
		],
		"name": "getUniversityFullDashboard",
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
				"internalType": "struct IUniversityDegreeProtocolCore.University",
				"name": "university",
				"type": "tuple"
			},
			{
				"internalType": "uint256[4]",
				"name": "stats",
				"type": "uint256[4]"
			},
			{
				"internalType": "address[]",
				"name": "verifiers",
				"type": "address[]"
			},
			{
				"internalType": "address[]",
				"name": "issuers",
				"type": "address[]"
			},
			{
				"internalType": "address[]",
				"name": "revokers",
				"type": "address[]"
			},
			{
				"internalType": "uint8",
				"name": "requiredApprovals",
				"type": "uint8"
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
			}
		],
		"name": "getUniversityPendingCounts",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "pendingDegree",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "pendingRevocation",
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
				"name": "universityId",
				"type": "uint64"
			},
			{
				"internalType": "address",
				"name": "verifier",
				"type": "address"
			}
		],
		"name": "getVerifierPendingApprovals",
		"outputs": [
			{
				"internalType": "uint256[]",
				"name": "pendingDegreeRequests",
				"type": "uint256[]"
			},
			{
				"internalType": "uint256[]",
				"name": "pendingRevocationRequests",
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
				"name": "universityId",
				"type": "uint64"
			}
		],
		"name": "getVerifiers",
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
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			}
		],
		"name": "quickDegreeCheck",
		"outputs": [
			{
				"internalType": "bool",
				"name": "exists",
				"type": "bool"
			},
			{
				"internalType": "bool",
				"name": "isValid",
				"type": "bool"
			},
			{
				"internalType": "address",
				"name": "owner",
				"type": "address"
			},
			{
				"internalType": "uint64",
				"name": "universityId",
				"type": "uint64"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
] as const
