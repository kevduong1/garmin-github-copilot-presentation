# Initial Context Gather - GFR Parameter Logging

> Reconstructed from memory for presentation/demo purposes.  
> This is intended to show the kind of context/prompt file that can be useful to keep outside the chat window.

## Goal

Gather enough context to design the **embedded display-side** work for GFR parameter logging, with emphasis on GDU / ADL / IOP / HSDB code paths.

## Actionable Tasks

1. Add GFR as a new log destination in the parameter logging model alongside FDL, GFDL, ACR, and OmniLog.
2. Extend parameter logging entries to support:
   - multiple destinations
   - per-entry rate / period selection (`1 Hz`, `2 Hz`, `4 Hz`)
3. Repurpose `GIFD_DISP-32770` to share **Source values** rather than DAT values over HSDB, limited to sources flagged for parameter logging.
4. Implement a source-sharing HSDB packet at **DAL D**, running at **4 Hz**, carrying the values needed by GFR.
5. Implement `IOP_D_GFR_ED155_DATA` using `IOP_gfr_ed155_pkt_type`:
   - ASYNC
   - no guaranteed delivery
   - variable length
   - up to 100 `IOP_gfr_ed155_data_type` entries
   - each entry contains:
     - validity
     - data type
     - ED-155 parameter ID
     - value
   - include source LRU and packet count
6. Support multiple packets per cycle when more than 100 parameters are configured.
7. Use `HSDB_pkt_send_data` or `HSDB_pkt_put_and_tx` for transmission; do **not** use `tx_proc`.
8. Size the ASYNC buffer based on worst-case parameter count rather than default assumptions.
9. Modify the GDL / config export flow to generate GFR `.greg` artifacts:
   - for each parameter entry with GFR as destination
   - emit config that identifies the source-sharing packet
   - emit the ED-155 / Post-Processing Type identifier used by GFR
10. Define a software-default parameter list for the shared GFR + OmniLog set, similar to `26_gfdl_common.game`.
11. Support airframe-specific overrides similar to `gfdl_arfrm.game` and `acr_arfrm.game`.
12. Unify Post Processing Type IDs across FDL / GFDL / OmniLog / GFR so a single ID can drive:
    - packet index
    - GFR output index
    - GFR config index

## Investigations Needed

1. Confirm IOP behavior for multiple ASYNC packets in a single periodic cycle:
   - are all packets transmitted?
   - or is only the latest one observed downstream?
2. Verify GFR-side reception behavior for back-to-back ASYNC instances.
3. Determine whether all required GFR data can be sourced from displays, or whether some data must come from sensor-direct paths.
4. Decide how redundant sensors should be represented:
   - AHRS1 / AHRS2 / AHRS3
   - standby sources
   - any other redundant feed that may need separate ED-155 mapping
5. Validate the relationship between Post Processing Type and ED-155 ID:
   - same namespace?
   - or explicit mapping layer?
6. Assess certification / PDI implications if `.game` / `.greg2` remain reference-only and GFR config is generated as a derived artifact.
7. Compute required ASYNC buffer depth based on maximum expected parameter count.
8. Confirm DAL D classification is acceptable for both:
   - source-sharing packets
   - ED-155 data packets

## Assumptions

1. ED-155 ID count is already large and will continue to grow.
2. The design should scale without interface redesign when the parameter list expands.
3. Displays are the authoritative source for the parameters GFR needs.
4. `.game` / `.greg2` files are GDU-facing configuration, while GFR config is derived from them.
5. No-guaranteed-delivery is acceptable for this use case.
6. Variable-length packets with an entry count are preferable to fixed-slot packets.
7. The default + airframe-override model used by GFDL / ACR can also support GFR + OmniLog.

## Risks / Edge Cases

1. If HSDB or IOP only forwards the latest ASYNC packet in a cycle, the multi-packet strategy fails.
2. Buffer overflow is possible if parameter count grows and ASYNC depth is not revisited.
3. Master GDU failover mid-cycle could cause source-LRU ambiguity or record duplication/loss if not handled carefully.
4. Packet loss is acceptable by design, but excessive loss should still be diagnosable.
5. Identifier drift between GFDL, OmniLog, GFR, and ED-155 namespaces could become a long-term maintenance problem.
6. Configuration traceability may become harder if presentation / editable config is not the same artifact GFR actually consumes.
7. A fully populated 4 Hz stream could create meaningful network load.
8. Airframe-specific divergence may erode the value of a shared default set over time.

## Dependencies

### Systems / Software

- SysRel 12.10 (OmniLog feature)
- HSDB transport
- IOP / ACL HSDB layer
- GDU configuration export path
- Arcade / airframe project configuration
- GFR `.greg` generation pipeline

### Data / Config

- `IOP_D_GFR_ED155_DATA`
- `IOP_gfr_ed155_pkt_type`
- `IOP_gfr_ed155_data_type`
- ED-155 parameter ID registry
- Post Processing Type ID registry
- Existing defaults such as:
  - `26_gfdl_common.game`
  - `gfdl_arfrm.game`
  - `acr_arfrm.game`

## Presentation Note

This file is a good example of why a separate prompt/context document can help:

- it preserves assumptions
- it captures open questions before implementation starts
- it keeps architectural intent stable even when chat history gets noisy
- it gives a reusable artifact that can be shared, reviewed, or versioned
