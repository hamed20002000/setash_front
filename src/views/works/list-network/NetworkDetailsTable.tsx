// src/views/works/WorkDetailsTable.tsx
import React, { useState } from 'react';
import {
    TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
    Typography, Box, IconButton, TablePagination, Collapse, Stack,
    TextField
} from '@mui/material';
import {
    IconCirclePlus, IconCircleMinus,
    IconChevronRight, IconChevronDown,
    IconEdit, IconTrash, IconCheck, IconX
} from '@tabler/icons-react';
import { WorkDetailSubEntry, WorkDetailRow } from './NetworkDetails';

interface WorkDetailsTableProps {
    registeredWorkEntries: WorkDetailRow[];
    onEditTrAdi: (trAdiId: string, newTrAdiName: string) => void;
    onDeleteTrAdi: (trAdiId: string) => void;
    onDeleteSubEntry: (trAdiParentId: string, subEntryId: string) => void;
    onTrAdiEditedInTable: (trAdiId: string, trAdiName: string) => void;
    onLoadSubEntryForEdit: (subEntry: WorkDetailSubEntry) => void;
}

interface SubEntryRowProps {
    subEntry: WorkDetailSubEntry;
    onDeleteSubEntry: (trAdiParentId: string, subEntryId: string) => void;
    onLoadSubEntryForEdit: (subEntry: WorkDetailSubEntry) => void;
}


const SubEntryRow: React.FC<SubEntryRowProps> = ({
    subEntry,
    onDeleteSubEntry,
    onLoadSubEntryForEdit
}) => {
    const [isSubExpanded, setIsSubExpanded] = useState(false);

    return (
        <React.Fragment>
            <TableRow sx={{
                '&:last-child td': { border: 0 },
                // اختیاری: می‌توانید رنگ پس‌زمینه سطر مجموع را کمی متفاوت کنید
                backgroundColor: subEntry.isToplamRow ? '#f9f9f9' : 'inherit'
            }}>
                <TableCell style={{ width: '50px' }}>
                    {/* دکمه بازشو برای همه سطرها (شامل مجموع) نمایش داده شود */}
                    {subEntry.itemDetails && subEntry.itemDetails.length > 0 && (
                        <IconButton size="small" onClick={() => setIsSubExpanded(!isSubExpanded)}>
                            {isSubExpanded ? <IconChevronDown size={20} /> : <IconChevronRight size={20} />}
                        </IconButton>
                    )}
                </TableCell>

                {/* نام DN (که شامل "TOPLAM" است) نمایش داده شود */}
                <TableCell>
                    <Typography variant="body2" fontWeight={subEntry.isToplamRow ? 'bold' : 'normal'}>
                        {subEntry.dn}
                    </Typography>
                </TableCell>

                {/* 🔴 تغییر مهم اینجاست: اگر سطر مجموع بود، خالی نشان بده، وگرنه مقدار را نشان بده */}
                <TableCell>
                    <Typography variant="body2">
                        {subEntry.isToplamRow ? '' : subEntry.yeni}
                    </Typography>
                </TableCell>
                <TableCell>
                    <Typography variant="body2">
                        {subEntry.isToplamRow ? '' : subEntry.dmm}
                    </Typography>
                </TableCell>
                <TableCell>
                    <Typography variant="body2">
                        {subEntry.isToplamRow ? '' : subEntry.mevcut}
                    </Typography>
                </TableCell>

                <TableCell sx={{ width: '100px', textAlign: 'right' }}>
                    {/* دکمه‌های ویرایش و حذف را برای سطر مجموع مخفی کنید تا اشتباهی پاک نشود */}
                    {!subEntry.isToplamRow && (
                        <>
                            <IconButton
                                size="small"
                                color="info"
                                onClick={() => onLoadSubEntryForEdit(subEntry)}
                                aria-label="edit sub entry"
                            >
                                <IconEdit size={18} />
                            </IconButton>
                            <IconButton
                                size="small"
                                color="error"
                                onClick={() => onDeleteSubEntry(subEntry.trAdiParentId, subEntry.id)}
                                aria-label="delete sub entry"
                            >
                                <IconTrash size={18} />
                            </IconButton>
                        </>
                    )}
                </TableCell>
            </TableRow>

            {/* بخش بازشوی Collapse بدون تغییر باقی می‌ماند تا آیتم‌های داخل TOPLAM دیده شوند */}
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                    <Collapse in={isSubExpanded} timeout="auto" unmountOnExit>
                        <Box sx={{
                            margin: 1,
                            ml: 4,
                            borderLeft: '2px solid #a7d9f7',
                            pl: 2,
                            pb: 1,
                            borderRadius: '4px',
                        }}>
                            {/* ... (کدهای نمایش آیتم‌ها بدون تغییر) ... */}
                            <Typography variant="caption" gutterBottom component="div"
                                sx={{ mt: 1, fontWeight: 'bold' }}>
                                {subEntry.isToplamRow ? 'Toplam Öğeler:' : 'Alt Öğeler:'}
                            </Typography>
                            {subEntry.itemDetails && subEntry.itemDetails.length > 0 ? (
                                <Stack direction="row" spacing={0.5} sx={{ pl: 2, pb: 1, flexWrap: 'wrap' }}>
                                    {subEntry.itemDetails.map((itemDetail, idx) => (
                                        <Typography key={itemDetail.tempId || idx} variant="body2"
                                            style={{ border: "1px solid #ccc", borderRadius: "4px", padding: "5px 8px", fontSize: '0.8rem' }}>
                                            {itemDetail.name}: <span style={{ fontWeight: "bold" }}>{itemDetail.value}</span>
                                        </Typography>
                                    ))}
                                </Stack>
                            ) : (
                                // ...
                                null
                            )}
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </React.Fragment>
    );
};

const NetworkDetailsTable: React.FC<WorkDetailsTableProps> = ({
    registeredWorkEntries,
    onEditTrAdi,
    onDeleteTrAdi,
    onDeleteSubEntry,
    onTrAdiEditedInTable,
    onLoadSubEntryForEdit
}) => {
    const [expandedTrAdiId, setExpandedTrAdiId] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [editingTrAdiId, setEditingTrAdiId] = useState<string | null>(null);
    const [editingTrAdiName, setEditingTrAdiName] = useState<string>('');
    const toggleExpandTrAdi = (trAdiId: string) => {
        setExpandedTrAdiId(expandedTrAdiId === trAdiId ? null : trAdiId);
    };
    const handleChangePage = (event: unknown, newPage: number) => {
        console.log(event)
        setPage(newPage);
    };
    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };
    const handleStartEditTrAdi = (trAdi: WorkDetailRow) => {
        setEditingTrAdiId(trAdi.id);
        setEditingTrAdiName(trAdi.trAdi);
    };
    const handleSaveTrAdiEdit = (trAdiId: string) => {
        if (editingTrAdiName.trim() && editingTrAdiId === trAdiId) {
            onEditTrAdi(trAdiId, editingTrAdiName.trim());
            onTrAdiEditedInTable(trAdiId, editingTrAdiName.trim());
            setEditingTrAdiId(null);
            setEditingTrAdiName('');
        }
    };
    const handleCancelTrAdiEdit = () => {
        setEditingTrAdiId(null);
        setEditingTrAdiName('');
    };
    const paginatedEntries = registeredWorkEntries.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    return (
        <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader aria-label="work details table">
                <TableHead style={{ background: "#f1f1f1" }}>
                    <TableRow>
                        <TableCell style={{ width: '50px' }}></TableCell>
                        <TableCell><Typography variant="h6" color="#171c23">TR ADI</Typography></TableCell>
                        <TableCell sx={{ width: '100px', textAlign: 'right' }}><Typography variant="h6" color="#171c23">İşlemler</Typography></TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {paginatedEntries.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={3} align="center">
                                <Typography variant="subtitle1" color="textSecondary">
                                    Henüz kayıtlı iş detayı bulunamadı.
                                </Typography>
                            </TableCell>
                        </TableRow>
                    ) : (
                        paginatedEntries.map((trAdiRow) => (
                            <React.Fragment key={trAdiRow.id}>
                                <TableRow sx={{ '&:last-child td': { border: 0 } }}>
                                    <TableCell>
                                        {trAdiRow.subEntries && trAdiRow.subEntries.length > 0 && (
                                            <IconButton size="small" onClick={() => toggleExpandTrAdi(trAdiRow.id)}>
                                                {expandedTrAdiId === trAdiRow.id ? <IconCircleMinus size={20} /> : <IconCirclePlus size={20} />}
                                            </IconButton>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {editingTrAdiId === trAdiRow.id ? (
                                            <TextField
                                                value={editingTrAdiName}
                                                onChange={(e) => setEditingTrAdiName(e.target.value)}
                                                size="small"
                                                variant="outlined"
                                                fullWidth
                                            />
                                        ) : (
                                            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{trAdiRow.trAdi}</Typography>
                                        )}
                                    </TableCell>
                                    <TableCell sx={{ textAlign: 'right' }}>
                                        {editingTrAdiId === trAdiRow.id ? (
                                            <>
                                                <IconButton size="small" color="success" onClick={() => handleSaveTrAdiEdit(trAdiRow.id)} aria-label="save tr adi">
                                                    <IconCheck size={18} />
                                                </IconButton>
                                                <IconButton size="small" color="error" onClick={handleCancelTrAdiEdit} aria-label="cancel tr adi edit">
                                                    <IconX size={18} />
                                                </IconButton>
                                            </>
                                        ) : (
                                            <>
                                                <IconButton
                                                    size="small"
                                                    color="info"
                                                    onClick={() => handleStartEditTrAdi(trAdiRow)}
                                                    aria-label="edit tr adi"
                                                >
                                                    <IconEdit size={18} />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => onDeleteTrAdi(trAdiRow.id)}
                                                    aria-label="delete tr adi"
                                                >
                                                    <IconTrash size={18} />
                                                </IconButton>
                                            </>
                                        )}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={3}>
                                        <Collapse in={expandedTrAdiId === trAdiRow.id} timeout="auto" unmountOnExit>
                                            <Box sx={{
                                                margin: 1,
                                                ml: 4,
                                                borderLeft: '2px solid #ccc',
                                                pl: 2,
                                                pb: 1,
                                                borderRadius: '4px',
                                            }}>
                                                <Typography variant="subtitle2" gutterBottom component="div" sx={{ mt: 1, fontWeight: 'bold' }}>
                                                    Alt İş Detayları:
                                                </Typography>
                                                {trAdiRow.subEntries && trAdiRow.subEntries.length > 0 ? (
                                                    <Table size="small" aria-label="sub work details table" sx={{ width: '100%' }}>
                                                        <TableHead>
                                                            <TableRow sx={{
                                                            }}>
                                                                <TableCell style={{ width: '50px' }}></TableCell>
                                                                <TableCell sx={{ fontWeight: 'bold' }}>D.N</TableCell>
                                                                <TableCell sx={{ fontWeight: 'bold' }}>YENİ</TableCell>
                                                                <TableCell sx={{ fontWeight: 'bold' }}>DMM</TableCell>
                                                                <TableCell sx={{ fontWeight: 'bold' }}>MEVCUT</TableCell>
                                                                <TableCell sx={{ width: '100px', textAlign: 'right', fontWeight: 'bold' }}>İşlemler</TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {trAdiRow.subEntries.map((subEntry) => (
                                                                <SubEntryRow
                                                                    key={subEntry.id}
                                                                    subEntry={subEntry}
                                                                    onDeleteSubEntry={onDeleteSubEntry}
                                                                    onLoadSubEntryForEdit={onLoadSubEntryForEdit}
                                                                />
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                ) : (
                                                    <Typography variant="body2" color="textSecondary" sx={{ ml: 1, pb: 1 }}>
                                                        Bu TR ADI için alt iş detayı eklenmedi.
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Collapse>
                                    </TableCell>
                                </TableRow>
                            </React.Fragment>
                        ))
                    )}
                </TableBody>
            </Table>
            <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={registeredWorkEntries.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Satır başına düşen:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`}
            />
        </TableContainer>
    );
};

export default NetworkDetailsTable;