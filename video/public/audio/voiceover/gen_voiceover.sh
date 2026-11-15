#!/bin/bash
cd /Users/ikhaisoshuare/KILLSWITCH/video/public/audio/voiceover

/usr/bin/say -v Samantha -o s08_attack_b.aiff "Then Agent B tries to spend zero point two six."
/usr/bin/say -v Samantha -o s09_attack_b_result.aiff "Zero point two six is more than zero point two five available. Blocked again."
/usr/bin/say -v Samantha -o s10_valid.aiff "But within the limit, everything works."
/usr/bin/say -v Samantha -o s11_spend_a.aiff "Agent A spends zero point six zero."
/usr/bin/say -v Samantha -o s12_spend_b.aiff "Agent B spends zero point two five."
/usr/bin/say -v Samantha -o s13_spend_c.aiff "Agent C spends zero point one five."
/usr/bin/say -v Samantha -o s14_settled.aiff "All three transfers settle. Exactly one NEAR reaches the vendor."
/usr/bin/say -v Samantha -o s15_revoke.aiff "Then the owner revokes Agent A."
/usr/bin/say -v Samantha -o s16_b_revoked.aiff "Agent B tries again."
/usr/bin/say -v Samantha -o s17_c_revoked.aiff "Agent C tries again."
/usr/bin/say -v Samantha -o s18_chain_stop.aiff "One revocation. The whole chain stops."
/usr/bin/say -v Samantha -o s19_proof.aiff "Recorded on NEAR testnet. Independently verified."
/usr/bin/say -v Samantha -o s20_checks.aiff "Twenty-five checks. All passing."
/usr/bin/say -v Samantha -o s21_close.aiff "INTENTRA."
/usr/bin/say -v Samantha -o s22_tagline.aiff "Authority can be delegated. It cannot multiply."
echo "All voiceover segments generated"
