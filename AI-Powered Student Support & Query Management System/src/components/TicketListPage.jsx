import { useState } from "react";
import {
  Box,
  Button,
  Card,
  Checkbox,
  FormControlLabel,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Stack,
  TablePagination,
  TextField,
} from "@mui/material";
import {
  AddRounded,
  FilterListRounded,
  SearchRounded,
} from "@mui/icons-material";
import { Link, useSearchParams } from "react-router-dom";
import { useApp } from "../context/appContext.js";
import { useAsync, useDebouncedValue } from "../hooks/useAsync.js";
import { adminService } from "../services/adminService.js";
import { ticketService } from "../services/ticketService.js";
import { STATUSES } from "../utils/constants.js";
import { ErrorState, PageHeader } from "./ui.jsx";
import TicketTable from "./TicketTable.jsx";
import ReassignDialog from "./ReassignDialog.jsx";
import { errorMessage } from "../utils/format.js";

export default function TicketListPage() {
  const [searchParams] = useSearchParams();
  return <TicketListContent key={searchParams.toString()} searchParams={searchParams} />;
}

function TicketListContent({ searchParams }) {
  const { user, t, revision, toast } = useApp();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "All");
  const [category, setCategory] = useState("");
  const [department, setDepartment] = useState("");
  const [mine, setMine] = useState(false);
  const [sort, setSort] = useState('newest');
  const [unassigned, setUnassigned] = useState(false);
  const [criticalOnly, setCriticalOnly] = useState(user.role === 'principal');
  const [claiming, setClaiming] = useState(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(8);
  const [reassign, setReassign] = useState(null);
  const debouncedSearch = useDebouncedValue(search);
  const refs = useAsync(adminService.getReferenceData, [revision]);
  const request = useAsync(
    () =>
      ticketService.listQueries({
        search: debouncedSearch,
        status,
        category_id: category,
        department_id: department,
          assigned_to: unassigned ? 'unassigned' : mine ? "me" : undefined,
          sort,
          critical_only: criticalOnly,
        page: page + 1,
        page_size: pageSize,
      }),
    [
      user.id,
      debouncedSearch,
      status,
      category,
      department,
      mine,
      sort,
      unassigned,
      criticalOnly,
      page,
      pageSize,
      revision,
    ],
  );
  const filter = (setter) => (event) => {
    setter(event.target.value);
    setPage(0);
  };
  const student = user.role === "student";
  const staff = user.role === "staff";
  const claim = async (ticket) => {
    setClaiming(ticket.id);
    try { await ticketService.claimTicket(ticket.id); toast(t('ticketClaimed')); }
    catch (error) { toast(errorMessage(error), 'error'); }
    finally { setClaiming(null); }
  };
  return (
    <>
      <PageHeader
        ready={!request.loading && !refs.loading}
        title={t(student ? "myQueries" : staff ? "ticketInbox" : criticalOnly ? 'criticalWatchlist' : "allTickets")}
        subtitle={t(student ? "queriesSubtitle" : "inboxSubtitle")}
        action={
          student && (
            <Button
              component={Link}
              to="/student/queries/new"
              variant="contained"
              startIcon={<AddRounded />}
            >
              {t("newQuery")}
            </Button>
          )
        }
      />
      <Card>
        <Box sx={{ p: 2.5 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            useFlexGap
            flexWrap="wrap"
          >
            <TextField
              data-pitch="ticket-search"
              value={search}
              onChange={filter(setSearch)}
              placeholder={t("searchTickets")}
              inputProps={{ "aria-label": t("searchTickets") }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRounded sx={{ fontSize: 19, color: "#9babb7" }} />
                  </InputAdornment>
                ),
              }}
              sx={{ flex: 1, minWidth: 220 }}
            />
            <TextField
              data-pitch="ticket-status-filter"
              select
              label={t("status")}
              value={status}
              onChange={filter(setStatus)}
              sx={{ minWidth: 170 }}
            >
              <MenuItem value="All">{t("allStatuses")}</MenuItem>
              <MenuItem value="Active">{t("pending")}</MenuItem>
              {STATUSES.map((s) => (
                <MenuItem key={s} value={s}>
                  {t(s)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              data-pitch="ticket-category-filter"
              select
              label={t("category")}
              value={category}
              onChange={filter(setCategory)}
              sx={{ minWidth: 175 }}
            >
              <MenuItem value="">{t("allCategories")}</MenuItem>
              {refs.data?.categories.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {t(c.name)}
                </MenuItem>
              ))}
            </TextField>
            {!student && !staff && (
              <TextField
                select
                label={t("department")}
                value={department}
                onChange={filter(setDepartment)}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="">{t("allDepartments")}</MenuItem>
                {refs.data?.departments.map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    {t(d.name)}
                  </MenuItem>
                ))}
              </TextField>
            )}
            {staff && <TextField data-pitch="ticket-sort" select label={t('sortBy')} value={sort} onChange={filter(setSort)} sx={{ minWidth: 160 }}><MenuItem value="newest">{t('newestFirst')}</MenuItem><MenuItem value="priority">{t('priorityFirst')}</MenuItem></TextField>}
          </Stack>
          {staff && <FormControlLabel control={<Checkbox size="small" checked={unassigned} onChange={(event) => { setUnassigned(event.target.checked); setPage(0); }} />} label={t('unassignedOnly')} />}
          {user.role === 'principal' && <FormControlLabel control={<Checkbox data-pitch="critical-filter" size="small" checked={criticalOnly} onChange={(event) => { setCriticalOnly(event.target.checked); setPage(0); }} />} label={t('criticalWatchlist')} />}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mt: 1.3 }}
          >
            {staff ? (
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={mine}
                    onChange={(e) => {
                      setMine(e.target.checked);
                      setPage(0);
                    }}
                  />
                }
                label={t("myAssignments")}
                sx={{
                  "& .MuiFormControlLabel-label": {
                    fontSize: ".77rem",
                    color: "text.secondary",
                  },
                }}
              />
            ) : (
              <Box />
            )}
            <Button
              size="small"
              startIcon={<FilterListRounded sx={{ fontSize: 15 }} />}
              sx={{ color: "text.secondary" }}
              onClick={() => {
                setSearch("");
                setStatus("All");
                setCategory("");
                setDepartment("");
                setMine(false);
                setUnassigned(false);
                setSort('newest');
                setCriticalOnly(user.role === 'principal');
                setPage(0);
              }}
            >
              {t("resetFilters")}
            </Button>
          </Stack>
        </Box>
        {request.loading && <LinearProgress sx={{ height: 2 }} />}
        {request.error ? (
          <ErrorState error={request.error} onRetry={request.reload} />
        ) : request.data ? (
          <TicketTable
            tickets={request.data.items}
            showStudent={!student}
            showSla={staff}
            now={request.data.now}
            onReassign={!student && !staff ? setReassign : undefined}
            onClaim={staff ? claim : undefined}
            claiming={claiming}
          />
        ) : (
          <Box sx={{ minHeight: 300 }} />
        )}
        <TablePagination
          component="div"
          count={request.data?.total || 0}
          page={Math.min(
            page,
            Math.max(0, Math.ceil((request.data?.total || 0) / pageSize) - 1),
          )}
          onPageChange={(_, value) => setPage(value)}
          rowsPerPage={pageSize}
          rowsPerPageOptions={[8, 15, 25]}
          onRowsPerPageChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(0);
          }}
          labelRowsPerPage={t("rowsPerPage")}
          sx={{
            borderTop: "1px solid #edf1f5",
            ".MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows":
              { fontSize: ".7rem" },
          }}
        />
      </Card>
      <ReassignDialog
        ticket={reassign}
        open={Boolean(reassign)}
        onClose={() => setReassign(null)}
        onSaved={request.reload}
      />
    </>
  );
}
