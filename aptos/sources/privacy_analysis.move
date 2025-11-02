// GenomeGuard Privacy Token Smart Contract
// Aptos Move implementation for decentralized genomic analysis

module genome_guard::privacy_analysis {
    use std::signer;
    use std::string::{Self, String};
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::timestamp;
    use aptos_framework::event;
    use aptos_std::table::{Self, Table};

    /// Error codes
    const E_NOT_AUTHORIZED: u64 = 1;
    const E_INSUFFICIENT_PAYMENT: u64 = 2;
    const E_ANALYSIS_NOT_FOUND: u64 = 3;
    const E_ALREADY_COMPLETED: u64 = 4;
    const E_INVALID_STATUS: u64 = 5;

    /// Analysis status constants
    const STATUS_PENDING: u8 = 0;
    const STATUS_PROCESSING: u8 = 1;
    const STATUS_COMPLETED: u8 = 2;
    const STATUS_FAILED: u8 = 3;

    /// Analysis cost in APT (0.1 APT)
    const ANALYSIS_COST_OCTAS: u64 = 10000000; // 0.1 APT

    /// Analysis Request Structure
    struct AnalysisRequest has key, store {
        user: address,
        encrypted_file_hash: String,  // IPFS hash of encrypted VCF
        status: u8,
        payment_amount: u64,
        created_at: u64,
        completed_at: u64,
        encrypted_result_hash: String,  // IPFS hash of encrypted results
        privacy_token_id: u64,
    }

    /// Privacy Token - Proof of ownership for analysis
    struct PrivacyToken has key, store {
        id: u64,
        analysis_id: u64,
        owner: address,
        created_at: u64,
        active: bool,
    }

    /// Platform state
    struct Platform has key {
        analysis_counter: u64,
        token_counter: u64,
        analyses: Table<u64, AnalysisRequest>,
        escrow_balance: u64,
        operator: address,
    }

    /// Events
    #[event]
    struct AnalysisRequestedEvent has drop, store {
        analysis_id: u64,
        user: address,
        encrypted_file_hash: String,
        payment: u64,
        timestamp: u64,
    }

    #[event]
    struct AnalysisCompletedEvent has drop, store {
        analysis_id: u64,
        user: address,
        encrypted_result_hash: String,
        timestamp: u64,
    }

    #[event]
    struct PrivacyTokenIssuedEvent has drop, store {
        token_id: u64,
        analysis_id: u64,
        owner: address,
        timestamp: u64,
    }

    /// Initialize the platform (called once by deployer)
    public entry fun initialize(account: &signer) {
        let platform = Platform {
            analysis_counter: 0,
            token_counter: 0,
            analyses: table::new(),
            escrow_balance: 0,
            operator: signer::address_of(account),
        };
        move_to(account, platform);
    }

    /// User requests genomic analysis
    /// Pays APT and receives Privacy Token
    public entry fun request_analysis(
        user: &signer,
        encrypted_file_hash: String,
    ) acquires Platform {
        let user_addr = signer::address_of(user);
        let platform = borrow_global_mut<Platform>(@genome_guard);

        // Transfer payment from user to escrow
        let payment = coin::withdraw<AptosCoin>(user, ANALYSIS_COST_OCTAS);
        coin::deposit(@genome_guard, payment);
        platform.escrow_balance = platform.escrow_balance + ANALYSIS_COST_OCTAS;

        // Create analysis request
        let analysis_id = platform.analysis_counter;
        platform.analysis_counter = analysis_id + 1;

        let token_id = platform.token_counter;
        platform.token_counter = token_id + 1;

        let analysis = AnalysisRequest {
            user: user_addr,
            encrypted_file_hash: copy encrypted_file_hash,
            status: STATUS_PENDING,
            payment_amount: ANALYSIS_COST_OCTAS,
            created_at: timestamp::now_seconds(),
            completed_at: 0,
            encrypted_result_hash: string::utf8(b""),
            privacy_token_id: token_id,
        };

        table::add(&mut platform.analyses, analysis_id, analysis);

        // Issue Privacy Token to user
        let privacy_token = PrivacyToken {
            id: token_id,
            analysis_id,
            owner: user_addr,
            created_at: timestamp::now_seconds(),
            active: true,
        };
        move_to(user, privacy_token);

        // Emit events
        event::emit(AnalysisRequestedEvent {
            analysis_id,
            user: user_addr,
            encrypted_file_hash,
            payment: ANALYSIS_COST_OCTAS,
            timestamp: timestamp::now_seconds(),
        });

        event::emit(PrivacyTokenIssuedEvent {
            token_id,
            analysis_id,
            owner: user_addr,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Backend operator submits analysis results
    public entry fun submit_results(
        operator: &signer,
        analysis_id: u64,
        encrypted_result_hash: String,
    ) acquires Platform {
        let operator_addr = signer::address_of(operator);
        let platform = borrow_global_mut<Platform>(@genome_guard);

        // Only authorized operator can submit
        assert!(operator_addr == platform.operator, E_NOT_AUTHORIZED);

        // Get analysis request
        assert!(table::contains(&platform.analyses, analysis_id), E_ANALYSIS_NOT_FOUND);
        let analysis = table::borrow_mut(&mut platform.analyses, analysis_id);

        // Verify status
        assert!(analysis.status != STATUS_COMPLETED, E_ALREADY_COMPLETED);

        // Update analysis
        analysis.status = STATUS_COMPLETED;
        analysis.completed_at = timestamp::now_seconds();
        analysis.encrypted_result_hash = copy encrypted_result_hash;

        // Release payment from escrow to operator
        // In production, this would transfer from escrow to operator
        // For simplicity, we just track completion
        platform.escrow_balance = platform.escrow_balance - analysis.payment_amount;

        // Emit event
        event::emit(AnalysisCompletedEvent {
            analysis_id,
            user: analysis.user,
            encrypted_result_hash,
            timestamp: timestamp::now_seconds(),
        });
    }

    // User retrieves their analysis status
    #[view]
    public fun get_analysis_status(analysis_id: u64): u8 acquires Platform {
        let platform = borrow_global<Platform>(@genome_guard);
        assert!(table::contains(&platform.analyses, analysis_id), E_ANALYSIS_NOT_FOUND);
        let analysis = table::borrow(&platform.analyses, analysis_id);
        analysis.status
    }

    // User retrieves encrypted result hash
    #[view]
    public fun get_encrypted_result(analysis_id: u64): String acquires Platform {
        let platform = borrow_global<Platform>(@genome_guard);
        assert!(table::contains(&platform.analyses, analysis_id), E_ANALYSIS_NOT_FOUND);
        let analysis = table::borrow(&platform.analyses, analysis_id);
        assert!(analysis.status == STATUS_COMPLETED, E_INVALID_STATUS);
        analysis.encrypted_result_hash
    }

    // Get total analyses count
    #[view]
    public fun get_total_analyses(): u64 acquires Platform {
        let platform = borrow_global<Platform>(@genome_guard);
        platform.analysis_counter
    }

    // Get user's analysis
    #[view]
    public fun get_user_analysis(user: address, analysis_id: u64): (u8, String) acquires Platform {
        let platform = borrow_global<Platform>(@genome_guard);
        assert!(table::contains(&platform.analyses, analysis_id), E_ANALYSIS_NOT_FOUND);
        let analysis = table::borrow(&platform.analyses, analysis_id);
        assert!(analysis.user == user, E_NOT_AUTHORIZED);
        (analysis.status, analysis.encrypted_result_hash)
    }
}
