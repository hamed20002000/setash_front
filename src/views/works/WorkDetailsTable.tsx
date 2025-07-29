// src/views/works/WorkDetailsTable.tsx
import React, { useState } from 'react';
import {
    TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
    Typography, Box, IconButton, TablePagination, Collapse, Stack,
    TextField // TextField ve Button برای ویرایش TR ADI
} from '@mui/material';
import {
    IconCirclePlus, IconCircleMinus,
    IconChevronRight, IconChevronDown,
    IconEdit, IconTrash, IconCheck, IconX // IconCheck و IconX برای دکمه‌های تایید/لغو ویرایش
} from '@tabler/icons-react';

// WorkItemDetail باید از WorkDetails.tsx ایمپورت شود
import { WorkDetailSubEntry, WorkDetailRow } from './WorkDetails'; // مسیر را بر اساس ساختار پروژه خود تنظیم کنید

// Props برای کامپوننت جدول اصلی
interface WorkDetailsTableProps {
    registeredWorkEntries: WorkDetailRow[]; // حالا یک آرایه از WorkDetailRow ها
    onEditTrAdi: (trAdiId: string, newTrAdiName: string) => void;
    onDeleteTrAdi: (trAdiId: string) => void;
    // onEditSubEntry: (trAdiParentId: string, subEntryId: string, subEntry: WorkDetailSubEntry) => void; // این پروپ دیگر مستقیماً استفاده نمی‌شود
    onDeleteSubEntry: (trAdiParentId: string, subEntryId: string) => void;
    onTrAdiEditedInTable: (trAdiId: string, trAdiName: string) => void;
    onLoadSubEntryForEdit: (subEntry: WorkDetailSubEntry) => void;
}

// -----------------------------------------------------------------------------
// Component for the second layer (Sub-entries for each TR ADI)
// -----------------------------------------------------------------------------
interface SubEntryRowProps {
    subEntry: WorkDetailSubEntry;
    // onEditSubEntry: (trAdiParentId: string, subEntryId: string, subEntry: WorkDetailSubEntry) => void; // این پروپ دیگر مستقیماً استفاده نمی‌شود
    onDeleteSubEntry: (trAdiParentId: string, subEntryId: string) => void;
    onLoadSubEntryForEdit: (subEntry: WorkDetailSubEntry) => void;
}

const SubEntryRow: React.FC<SubEntryRowProps> = ({
    subEntry,
    // onEditSubEntry, // این پروپ دیگر مستقیماً استفاده نمی‌شود
    onDeleteSubEntry,
    onLoadSubEntryForEdit
}) => {
    // State برای مدیریت باز/بسته بودن ردیف‌های لایه دوم (آیتم‌های جزئی)
    const [isSubExpanded, setIsSubExpanded] = useState(false);

    return (
        <React.Fragment>
            <TableRow sx={{ '&:last-child td': { border: 0 }, backgroundColor: '#f9f9f9' }}> {/* کمی رنگ پس‌زمینه متفاوت */}
                <TableCell style={{ width: '50px' }}>
                    {subEntry.itemDetails && subEntry.itemDetails.length > 0 && (
                        <IconButton size="small" onClick={() => setIsSubExpanded(!isSubExpanded)}>
                            {isSubExpanded ? <IconChevronDown size={20} /> : <IconChevronRight size={20} />}
                        </IconButton>
                    )}
                </TableCell>
                <TableCell><Typography variant="body2">{subEntry.dn}</Typography></TableCell>
                <TableCell><Typography variant="body2">{subEntry.yeni}</Typography></TableCell>
                <TableCell><Typography variant="body2">{subEntry.dmm}</Typography></TableCell>
                <TableCell><Typography variant="body2">{subEntry.mevcut}</Typography></TableCell>
                {/* ✅ سلول جدید برای دکمه‌های عملیات زیرمجموعه */}
                <TableCell sx={{ width: '100px', textAlign: 'right' }}>
                    <IconButton
                        size="small"
                        color="info"
                        onClick={() => onLoadSubEntryForEdit(subEntry)} // فراخوانی تابع برای لود کردن داده‌ها در فرم والد
                        aria-label="edit sub entry"
                    >
                        <IconEdit size={18} />
                    </IconButton>
                    <IconButton
                        size="small"
                        color="error"
                        onClick={() => onDeleteSubEntry(subEntry.trAdiParentId, subEntry.id)} // فراخوانی تابع حذف زیرمجموعه
                        aria-label="delete sub entry"
                    >
                        <IconTrash size={18} />
                    </IconButton>
                </TableCell>
            </TableRow>
            {/* Collapse row for itemDetails (third layer) */}
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}> {/* colSpan باید برابر با تعداد ستون‌های لایه دوم باشد */}
                    <Collapse in={isSubExpanded} timeout="auto" unmountOnExit>
                        <Box sx={{
                            margin: 1,
                            ml: 4, // Indent for third layer
                            borderLeft: '2px solid #a7d9f7', // Light blue line
                            pl: 2,
                            pb: 1,
                            backgroundColor: '#ffffff', // Beyaz veya çok açık bir renk
                            borderRadius: '4px',
                        }}>
                            <Typography variant="caption" gutterBottom component="div" sx={{ mt: 1, fontWeight: 'bold' }}>
                                Alt Öğeler:
                            </Typography>
                            {subEntry.itemDetails && subEntry.itemDetails.length > 0 ? (
                                <Stack direction="row" spacing={0.5} sx={{ pl: 2, pb: 1, flexWrap: 'wrap' }}> {/* نمایش آیتم‌ها به صورت عمودی با فاصله کم */}
                                    {subEntry.itemDetails.map((itemDetail, idx) => (
                                        <Typography key={itemDetail.tempId || idx} variant="body2"
                                            style={{ border: "1px solid #ccc", borderRadius: "4px", padding: "5px 8px", fontSize: '0.8rem' }}>
                                            {itemDetail.name}: <span style={{ fontWeight: "bold" }}>{itemDetail.value}</span>
                                        </Typography>
                                    ))}
                                </Stack>
                            ) : (
                                <Typography variant="body2" color="textSecondary" sx={{ ml: 1, pb: 1 }}>
                                    Hiç alt öğe eklenmedi.
                                </Typography>
                            )}
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </React.Fragment>
    );
};


// -----------------------------------------------------------------------------
// Main WorkDetailsTable Component
// -----------------------------------------------------------------------------
const WorkDetailsTable: React.FC<WorkDetailsTableProps> = ({
    registeredWorkEntries,
    onEditTrAdi,
    onDeleteTrAdi,
    // onEditSubEntry, // این پروپ دیگر مستقیماً استفاده نمی‌شود
    onDeleteSubEntry,
    onTrAdiEditedInTable,
    onLoadSubEntryForEdit
}) => {
    // State to manage which TR ADI row is expanded.
    const [expandedTrAdiId, setExpandedTrAdiId] = useState<string | null>(null);

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);

    // State برای مدیریت ویرایش TR ADI در خود جدول
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

    // توابع جدید برای ویرایش TR ADI
    const handleStartEditTrAdi = (trAdi: WorkDetailRow) => {
        setEditingTrAdiId(trAdi.id);
        setEditingTrAdiName(trAdi.trAdi);
    };

    const handleSaveTrAdiEdit = (trAdiId: string) => {
        if (editingTrAdiName.trim() && editingTrAdiId === trAdiId) {
            onEditTrAdi(trAdiId, editingTrAdiName.trim());
            onTrAdiEditedInTable(trAdiId, editingTrAdiName.trim()); // اطلاع به والد
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
                        <TableCell style={{ width: '50px' }}></TableCell> {/* Column for TR ADI expand icon */}
                        <TableCell><Typography variant="h6" color="#171c23">TR ADI</Typography></TableCell>
                        {/* ستون جدید برای عملیات TR ADI */}
                        <TableCell sx={{ width: '100px', textAlign: 'right' }}><Typography variant="h6" color="#171c23">İşlemler</Typography></TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {paginatedEntries.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={3} align="center"> {/* colSpan for main table */}
                                <Typography variant="subtitle1" color="textSecondary">
                                    Henüz kayıtlı iş detayı bulunamadı.
                                </Typography>
                            </TableCell>
                        </TableRow>
                    ) : (
                        paginatedEntries.map((trAdiRow) => (
                            <React.Fragment key={trAdiRow.id}>
                                {/* First Layer: TR ADI */}
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
                                    {/* سلول جدید برای دکمه‌های عملیات TR ADI */}
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

                                {/* Second Layer: Collapsible table for sub-entries (D.N, YENİ, DMM, MEVCUT) */}
                                <TableRow>
                                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={3}> {/* colSpan for main table */}
                                        <Collapse in={expandedTrAdiId === trAdiRow.id} timeout="auto" unmountOnExit>
                                            <Box sx={{
                                                margin: 1,
                                                ml: 4, // Indent for second layer
                                                borderLeft: '2px solid #ccc', // Grey line
                                                pl: 2,
                                                pb: 1,
                                                backgroundColor: '#efefef', // Açık gri arka plan
                                                borderRadius: '4px',
                                            }}>
                                                <Typography variant="subtitle2" gutterBottom component="div" sx={{ mt: 1, fontWeight: 'bold' }}>
                                                    Alt İş Detayları:
                                                </Typography>
                                                {trAdiRow.subEntries && trAdiRow.subEntries.length > 0 ? (
                                                    <Table size="small" aria-label="sub work details table" sx={{ width: '100%' }}>
                                                        <TableHead>
                                                            <TableRow sx={{ backgroundColor: '#e0e0e0' }}> {/* Koyu gri header */}
                                                                <TableCell style={{ width: '50px' }}></TableCell>
                                                                <TableCell sx={{ fontWeight: 'bold' }}>D.N</TableCell>
                                                                <TableCell sx={{ fontWeight: 'bold' }}>YENİ</TableCell>
                                                                <TableCell sx={{ fontWeight: 'bold' }}>DMM</TableCell>
                                                                <TableCell sx={{ fontWeight: 'bold' }}>MEVCUT</TableCell>
                                                                {/* ستون جدید برای عملیات زیرمجموعه */}
                                                                <TableCell sx={{ width: '100px', textAlign: 'right', fontWeight: 'bold' }}>İşlemler</TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {trAdiRow.subEntries.map((subEntry) => (
                                                                // SubEntryRow را با props های جدید فراخوانی می‌کنیم
                                                                <SubEntryRow
                                                                    key={subEntry.id}
                                                                    subEntry={subEntry}
                                                                    // onEditSubEntry={onEditSubEntry} // این پروپ دیگر مستقیماً استفاده نمی‌شود
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

export default WorkDetailsTable;